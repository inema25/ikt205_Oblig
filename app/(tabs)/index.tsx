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
    Modal, KeyboardAvoidingView, Platform, Animated, Alert
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

// Import Firebase functions (v9+ modular SDK)
import { db } from '@/firebaseConfig'; // Importer Firestore DB
import {addDoc, collection, deleteDoc, doc, getDocs, updateDoc, query, where} from 'firebase/firestore'; // Importer nødvendige Firestore-funksjoner
import {FontAwesome6} from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ScrollView = Animated.ScrollView;
//import {Simulate} from "react-dom/test-utils";
//import reset = Simulate.reset;

type ItemProps = {
    id: string,
    fName: string,
    lName: string,
    email: string,
    studentId: string,
    onEdit: (student: any) => void;
    onDelete: (student: any) => void;
    onAddGrade: (student: any) => void;
};

const Item = ({ id, fName, lName, email, studentId, onEdit, onDelete, onAddGrade }: ItemProps) => (
    <View style={styles.item}>
        <Text style={styles.title}>{`${fName} ${lName}`}</Text>
        <Text>{email}</Text>
        <Text>{studentId}</Text>
        <View style={styles.buttonContainer}>
            <TouchableOpacity
                style={styles.gradeButton}
                onPress={() => onAddGrade({ id, fName, lName, email, studentId })}>
                <Text style={styles.gradeButtonText}>Add Grade</Text>
            </TouchableOpacity>
        </View>
        <FontAwesome6
            name={"edit"}
            size={24}
            color={"black"}
            style={styles.editIcon}
            onPress={() => onEdit({ id, fName, lName, email, studentId })}
        />
        <AntDesign
            name={"delete"}
            size={24}
            color={"black"}
            style={styles.deleteIcon}
            onPress={() => onDelete({ id, fName, lName, email, studentId })}
        />
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
                studentId: doc.data().studentId,
            }));
            setData(list);
        } catch (error) {
            console.error('Feil ved henting av data fra Firestore:', error);
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
        studentId: string;
    }>({
        fName: '',
        lName: '',
        email: '',
        studentId: '',
    });

    const handleInputChange = (field: 'fName' | 'lName' | 'email' | 'studentId', value: string) => {
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
            email: '',
            studentId: ''
        });
    };

    const saveStudent = async () => {
        if (!newStudent.fName.trim() || !newStudent.lName.trim() || !newStudent.studentId.trim()) {
            Alert.alert("Missing information", "Please provide first name, last name, and student ID.");
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
            fetchStudents();

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

    //--------------------\\
    // Add this function to fetch subjects
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

// Update your useEffect to call fetchSubjects
    useEffect(() => {
        fetchStudents();
        fetchSubjects();
    }, []);

// Add function to handle opening the grade modal
    const handleAddGrade = (student: any) => {
        setCurrentStudent(student);
        setGradeModalVisible(true);
        setSelectedSubject('');
        setGradeValue('');
    };
// Helper function to convert letter grades to numeric values for comparison
    const gradeToValue = (grade) => {
        const gradeMap = {
            'A': 5,
            'B': 4,
            'C': 3,
            'D': 2,
            'E': 1,
            'F': 0
        };
        return gradeMap[grade.toUpperCase()] ?? -1; // Return -1 for invalid grades
    };

// Modified saveGrade function to check for existing grades
    const saveGrade = async () => {
        if (!selectedSubject || !gradeValue || !currentStudent) {
            Alert.alert('Missing Information', 'Please select a subject and enter a grade');
            return;
        }

        try {
            // Reference to the grades subcollection for this student
            const gradeRef = collection(db, 'students', currentStudent.id, 'grades');

            // Query to check if a grade already exists for this subject
            const q = query(gradeRef, where("subject", "==", selectedSubject));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Grade exists for this subject
                const existingGradeDoc = querySnapshot.docs[0];
                const existingGrade = existingGradeDoc.data().grade;

                // Compare grades (higher grade value is better)
                if (gradeToValue(gradeValue) > gradeToValue(existingGrade)) {
                    // New grade is higher, update the existing document
                    await updateDoc(doc(db, 'students', currentStudent.id, 'grades', existingGradeDoc.id), {
                        grade: gradeValue,
                        dateModified: new Date()
                    });
                    Alert.alert('Success', 'Grade updated to higher score');
                } else {
                    // New grade is not higher
                    Alert.alert('No Change', 'The new grade is not higher than the existing grade');
                }
            } else {
                // No grade exists for this subject, add a new one
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
                    placeholder="Søk etter student..."
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

                                <Text style={styles.inputLabel}>Student ID *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter student ID"
                                    value={newStudent.studentId}
                                    onChangeText={(text) => handleInputChange('studentId', text)}
                                    keyboardType="number-pad"
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
                            studentId={item.studentId}
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
        backgroundColor: '#f9c2ff',
        padding: 20,
        marginVertical: 8,
        marginHorizontal: 16,
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    input: {
        height: 40,
        marginVertical: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        borderColor: '#ccc',
        borderRadius: 4,
    },
    // Styling for the edit icon
    deleteIcon: {
        position: 'absolute',  // Place the icon absolutely within the container
        right: 10,  // 10 units from the right
        top: '50%',  // Vertically centered
        transform: [{ translateY: -12 }],  // Fine-tune the vertical position
    },
    // Styling for the delete icon
    editIcon: {
        position: 'absolute',  // Place the icon absolutely within the container
        right: 40,  // 40 units from the right, ensuring no overlap with the edit icon
        top: '50%',  // Vertically centered
        transform: [{ translateY: -12 }],  // Fine-tune the vertical position
    },
    // Styling for add knappen
    addButton: {
        backgroundColor: '#0066cc',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 4,
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
        paddingVertical: 6,
        paddingHorizontal: 12,
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
    }
});

export default ManageStudentApp;
