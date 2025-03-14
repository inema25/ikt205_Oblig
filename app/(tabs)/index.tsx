import React, { useEffect, useState } from 'react';
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
    TextInput,
    TouchableOpacity,
    Modal,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
    StatusBar
} from 'react-native';

import { db } from '@/firebaseConfig'; // Importerer Firestore DB
import {addDoc,
        collection,
        deleteDoc,
        doc,
        getDocs,
        updateDoc,
        query,
        where} from 'firebase/firestore'; // Importer nødvendige Firestore-funksjoner

import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome6 } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ScrollView = Animated.ScrollView;

type ItemProps = {
    id: string,
    fName: string,
    lName: string,
    email: string,
    onEdit: (student: any) => void;
    onDelete: (student: any) => void;
    onAddGrade: (student: any) => void;
};

const Item = ({ id, fName, lName, email, onEdit, onDelete, onAddGrade }: ItemProps) => (
    <View style={styles.item}>
        {/*Første rad i flexboks*/}
        <View style={styles.row}>
            <View style={styles.boxTitle}>
                <Text style={styles.title}>{`${fName} ${lName}`}</Text>
            </View>

            <View style={styles.boxButtons}>
                <FontAwesome6
                    name={"edit"}
                    size={24}
                    color={"black"}
                    onPress={() => onEdit({ id, fName, lName, email })}
                />
                <AntDesign
                    name={"delete"}
                    size={24}
                    color={"black"}
                    onPress={() => onDelete({ id, fName, lName, email })}
                />
            </View>

        </View>

        {/* Andre rad i flexboks */}
        <View style={styles.boxText}>
            <Text>{email}</Text>
        </View>

        {/* Tredje rad i flexboks*/}
        <View style={styles.boxAddButton}>
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={styles.gradeButton}
                    onPress={() => onAddGrade({ id, fName, lName, email})}>
                    <Text style={styles.gradeButtonText}>Add Grade</Text>
                </TouchableOpacity>
            </View>
        </View>


    </View>
);

const ManageStudentApp = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState<string>(''); // State for søketekst
    const [modalVisible, setModalVisible] = useState(false);
    const [savingStudent, setSavingStudent] = useState(false);
    const [editStudent, setEditStudent] = useState<ItemProps | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [studentDelete, setStudentDelete] = useState<any>(null);

    const [gradeModalVisible, setGradeModalVisible] = useState(false);
    const [currentStudent, setCurrentStudent] = useState<any>(null);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [gradeValue, setGradeValue] = useState<string>('');

    useEffect(() => {
        fetchStudents();
    }, []);

    // Henter fag når amn navigerer til Student Management tab
    useFocusEffect(
        React.useCallback(() => {
            fetchSubjects();
            return () => {};
        }, [])
    );

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    // Filtrere dataene basert på fornavn og etternavn
    const filteredData = data.filter(
        (item) =>
            item.fName.toLowerCase().includes(searchText.toLowerCase()) || // Søk på fornavn
            item.lName.toLowerCase().includes(searchText.toLowerCase()) // Søk på etternavn
    );

    // Henter studentdata
    const fetchStudents = async () => {
        try {
            // Hent data fra Firestore
            const querySnapshot = await getDocs(collection(db, 'students')); // Kall på Firestore
            const list = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                fName: doc.data().fName,
                lName: doc.data().lName,
                email: doc.data().email,
            }));
            setData(list);
        } catch (error) {
            console.error('Error fetching data from Firestore:', error);
        } finally {
            setLoading(false);
        }
    };

    // Ny student form
    const [newStudent, setNewStudent] = useState<{
        id?: string;  // Gjør id valgfritt
        fName: string;
        lName: string;
        email: string;
    }>({
        fName: '',
        lName: '',
        email: '',
    });

    // Håndterer endringer i inputfeltene, og lagrer
    const handleInputChange = (field: 'fName' | 'lName' | 'email', value: string) => {
        setNewStudent(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleEditPress = (student: ItemProps) => {
        setNewStudent(student);  // Fyll inn eksisterende data
        setEditStudent(student);  // Marker at vi redigerer
        setModalVisible(true);
    };

    const handleDeletePress = (student: ItemProps) => {
        setStudentDelete(student);  // Sett den valgte studenten
        setDeleteModalVisible(true);  // Vis slettemodal
    };


    const resetForm = () => {
        setNewStudent({
            fName: '',
            lName: '',
            email: ''
        });
    };

    const saveStudent = async () => {
        if (!newStudent.fName.trim() || !newStudent.lName.trim()) {
            Alert.alert("Missing information", "Please provide first name and last name.");
            return;
        }

        if (newStudent.email.trim() && !newStudent.email.includes('@')) {
            Alert.alert("Invalid E-mail", "Please provide a valid E-mail address.");
            return;
        }

        try {
            setSavingStudent(true);

            if (editStudent && editStudent.id) {
                // Oppdaterer eksisterende student
                const { id, ...studentData } = newStudent; // Fjern 'id' fra oppdateringen
                await updateDoc(doc(db, "students", editStudent.id), studentData);
            } else {
                // Legg til ny student
                const studentsCollectionRef = collection(db, "students");
                await addDoc(studentsCollectionRef, newStudent);
            }

            setModalVisible(false);
            resetForm();
            setEditStudent(null);

            await fetchStudents();

            Alert.alert("Success", editStudent ? "Student updated successfully." : "Student added successfully.");
        } catch (error) {
            console.error("Error saving student", error);
            Alert.alert("Error", "Failed to save student, please try again.");
        } finally {
            setSavingStudent(false);
        }
    };

    const deleteStudent = async () => {
        if (studentDelete) {
            try {
                // Henter karakterene til studenten
                const gradesRef = collection(db, "students", studentDelete.id, "grades");
                const gradesSnapshot = await getDocs(gradesRef);

                // Sletter hvert grade dokument
                const deletePromises = gradesSnapshot.docs.map(gradeDoc =>
                    deleteDoc(doc(db, "students", studentDelete.id, "grades", gradeDoc.id))
                );

                // Vent for alle slettinger av karakterer til å fullføre
                await Promise.all(deletePromises);

                // Sletter studenten fra Firestore
                await deleteDoc(doc(db, "students", studentDelete.id));

                setDeleteModalVisible(false);  // Skjul modal etter sletting
                fetchStudents();  // Oppdater listen etter sletting
                Alert.alert("Success", "Student deleted.");
            } catch (error) {
                Alert.alert("Error", "Failed to delete student.");
            }
        }
    };

    // Hente fag for å legge til karakter
    const fetchSubjects = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'subjects'));
            const subjectsList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                courseCode: doc.data().courseCode,
                name: doc.data().name,
                teacher: doc.data().teacher
            }));
            setSubjects(subjectsList);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    /*useEffect(() => {
        fetchStudents();
        fetchSubjects();
    }, []);*/

    const handleAddGrade = (student: any) => {
        setCurrentStudent(student);
        setGradeModalVisible(true);
        setSelectedSubject('');
        setGradeValue('');
    };

// Hjelpefunksjon for å konvertere bokstavkarakterer til tall-verdier
    const gradeToValue = (grade: string): number => {
        const gradeMap: {[key: string]: number} = {
            'A': 5,
            'B': 4,
            'C': 3,
            'D': 2,
            'E': 1,
            'F': 0
        };
        const upperGrade = grade.toUpperCase();
        return (upperGrade in gradeMap) ? gradeMap[upperGrade] : -1;
    };


// Funksjon for å sjekke for eksisterende karakter og lagre ny karakter
    const saveGrade = async () => {
        if (!selectedSubject || !gradeValue || !currentStudent) {
            Alert.alert('Missing Information', 'Please select a subject and enter a grade');
            return;
        }

        try {

            const gradeRef = collection(db, 'students', currentStudent.id, 'grades');
            const q = query(gradeRef, where("subject", "==", selectedSubject));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const existingGradeDoc = querySnapshot.docs[0];
                const existingGrade = existingGradeDoc.data().grade;

                // Sammenligner ny karakter med eksisterende karakter
                if (gradeToValue(gradeValue) > gradeToValue(existingGrade)) {
                    await updateDoc(doc(db, 'students', currentStudent.id, 'grades', existingGradeDoc.id), {
                        grade: gradeValue,
                        dateModified: new Date()
                    });
                    Alert.alert('Success', 'Grade updated to higher score');
                } else {
                    Alert.alert('No Change', 'The new grade is not higher than the existing grade');
                }
            } else {
                // Legger til ny karakter hvis den ikke finnes
                await addDoc(gradeRef, {
                    subject: selectedSubject,
                    grade: gradeValue,
                    dateAdded: new Date()
                });
                Alert.alert('Success', 'Grade added successfully');
            }

            setGradeModalVisible(false);
        } catch (error) {
            console.error('Error saving grade:', error);
            Alert.alert('Error', 'Failed to save grade');
        }
    };


    //--------------------\\


    if (loading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.container}>
                    <ActivityIndicator size="large" color="#0000ff" />
                </SafeAreaView>
            </SafeAreaProvider>
        );
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.container}>
                {/* Søkeboks */}
                <TextInput
                    style={styles.input}
                    value={searchText}
                    onChangeText={handleSearch}
                    placeholder="Search student..."
                />

                {/* Add knapp */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    >

                    <Text style={styles.addButtonText}>+ Add Student</Text>
                </TouchableOpacity>

                {/* Modal for add/edit student */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalVisible}
                    onRequestClose={() => setModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                {editStudent ? "Edit Student" : "Add New Student"} {/*Viser edit eller add etter hva som ble trykket på*/}
                            </Text>

                            <ScrollView style={styles.formContainer}>
                                <Text style={styles.inputLabel}>First Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter first name"
                                    value={newStudent.fName}
                                    onChangeText={(text) => handleInputChange('fName', text)}
                                />

                                <Text style={styles.inputLabel}>Last Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter last name"
                                    value={newStudent.lName}
                                    onChangeText={(text) => handleInputChange('lName', text)}
                                />

                                <Text style={styles.inputLabel}>Email</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter email address"
                                    value={newStudent.email}
                                    onChangeText={(text) => handleInputChange('email', text)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </ScrollView>

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => {
                                        setModalVisible(false);
                                        resetForm();
                                    }}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={saveStudent}
                                    disabled={savingStudent}
                                >
                                    {savingStudent ? (
                                        <ActivityIndicator size="small" color="white" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/*Modal for sletting av studenter*/}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={deleteModalVisible}
                    onRequestClose={() => setDeleteModalVisible(false)}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContainer}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Confirm Deletion</Text>

                            <Text style={styles.inputLabel}>Are you sure you want to delete this student?</Text>
                            {studentDelete && (
                                <View>
                                    <Text>{`${studentDelete.fName} ${studentDelete.lName}`}</Text>
                                    <Text>{studentDelete.email}</Text>
                                    <Text>{studentDelete.studentId}</Text>
                                </View>
                            )}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setDeleteModalVisible(false)}  // Lukk modal
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={deleteStudent}  // Kall på slett-funksjonen
                                >
                                    <Text style={styles.saveButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                {/* Modal for å sette grade */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={gradeModalVisible}
                    onRequestClose={() => setGradeModalVisible(false)}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>
                                Add Grade for {currentStudent?.fName} {currentStudent?.lName}
                            </Text>

                            <Text style={styles.inputLabel}>Select Subject</Text>
                            <View style={styles.picker}>
                                <FlatList
                                    data={subjects}
                                    horizontal={false}
                                    style={{maxHeight: 150}}
                                    renderItem={({item}) => (
                                        <TouchableOpacity
                                            style={[
                                                styles.subjectItem,
                                                selectedSubject === item.courseCode && styles.selectedSubject
                                            ]}
                                            onPress={() => setSelectedSubject(item.courseCode)}>
                                            <Text>{item.courseCode} - {item.name}</Text>
                                        </TouchableOpacity>
                                    )}
                                    keyExtractor={item => item.id}
                                />
                            </View>

                            <Text style={styles.inputLabel}>Grade</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter grade (A-F)"
                                value={gradeValue}
                                onChangeText={setGradeValue}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setGradeModalVisible(false)}>
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={saveGrade}>
                                    <Text style={styles.saveButtonText}>Save Grade</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>



                {/* FlatList med filtrerte data */}
                <FlatList
                    data={filteredData}
                    renderItem={({ item }) => (
                        <Item
                            id={item.id}
                            fName={item.fName}
                            lName={item.lName}
                            email={item.email}
                            onEdit={handleEditPress}
                            onDelete={handleDeletePress}
                            onAddGrade={handleAddGrade}/>
                    )}
                    keyExtractor={item => item.id}
                    numColumns={1}
                />
            </SafeAreaView>
        </SafeAreaProvider>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: StatusBar.currentHeight || 0,
        paddingHorizontal: 16,
    },
    item: {
        backgroundColor: 'white',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        flex: 1,
        borderWidth: 1,
        borderColor: 'grey',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        height: 40,
        borderWidth: 1,
        paddingHorizontal: 10,
        borderColor: '#ccc',
        borderRadius: 4,
        margin: 15,
    },
    // Styling for add knappen
    addButton: {
        backgroundColor: '#0066cc',
        padding: 15,
        borderRadius: 4,
        margin: 15,
    },
    addButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    // Styling for modal-vinduet
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        margin: 20,
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
        color: '#333',
    },
    formContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 4,
        color: '#444',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f2f2f2',
        padding: 12,
        borderRadius: 6,
        marginRight: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#666',
        fontWeight: '600',
        fontSize: 16,
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#0066cc',
        padding: 12,
        borderRadius: 6,
        marginLeft: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 16,
    },
    gradeButton: {
        backgroundColor: '#28a745',
        padding: 10,
        borderRadius: 4,
        marginTop: 8,
    },
    gradeButtonText: {
        color: 'white',
        fontWeight: '500',
    },
    buttonContainer: {
        marginTop: 4,
        marginBottom: 4,
    },
    picker: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 4,
        marginVertical: 8,
    },
    subjectItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    selectedSubject: {
        backgroundColor: '#e6f7ff',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    boxTitle: {
        flex: 1,
    },
    boxButtons: {
        alignSelf: 'flex-end',
        flexDirection: 'row',
        gap: 10,
    },
    boxText: {
        marginBottom: 10,
    },
    boxAddButton: {
        alignItems: 'center',
    }
});

export default ManageStudentApp;
