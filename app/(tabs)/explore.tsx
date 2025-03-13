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
    Modal, KeyboardAvoidingView, Animated, Alert
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar, Platform } from 'react-native';

// Import Firebase functions (v9+ modular SDK)
import { db } from '@/firebaseConfig'; // Importer Firestore DB
import {addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc, where} from 'firebase/firestore'; // Importer nødvendige Firestore-funksjoner
import {FontAwesome6} from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ScrollView = Animated.ScrollView;
import { BarChart } from 'react-native-chart-kit'; // npm i react-native-chart-kit
//import {Simulate} from "react-dom/test-utils";
//import reset = Simulate.reset;

type ItemProps = {
    id: string,
    name: string,
    courseCode: string,
    teacher: string,
    onEdit: (subject: any) => void;
    onDelete: (subject: any) => void;
    gradeDistribution?: {[courseCode: string]: {[grade: string]: number}};
};

const Item = ({ id, name, teacher, courseCode, onEdit, onDelete, gradeDistribution }: ItemProps) => {
    // Create a safe way to access grade values with fallbacks
    const getGradeValue = (grade: string): number => {
        if (gradeDistribution &&
            gradeDistribution[courseCode] &&
            gradeDistribution[courseCode][grade] !== undefined) {
            return gradeDistribution[courseCode][grade];
        }
        return 0;
    };

    //Finner maksverdien for y-aksen
    const calculateYAxisMax = () => {
        if (!gradeDistribution || !gradeDistribution[courseCode]) return 5;

        const grades = ['A', 'B', 'C', 'D', 'E', 'F'];
        const values = grades.map(grade => getGradeValue(grade));
        const maxValue = Math.max(...values);

        // Return max value + 5 (or at least 5 if the max is very small)
        return Math.max(maxValue + 5, 5);
    };


    return (
        <View style={styles.item}>

            {/* Første rad i flexboks: tittel og knapper */}
            <View style={styles.row}>
                <View style={styles.boxTitle}>
                    <Text style={styles.title}>{`${courseCode} ${name}`}</Text>
                </View>
                <View style={styles.boxButtons}>
                    <FontAwesome6
                        name={"edit"}
                        size={24}
                        color={"black"}
                        onPress={() => onEdit({ id, name, teacher, courseCode })}
                    />
                    <AntDesign
                        name={"delete"}
                        size={24}
                        color={"black"}
                        onPress={() => onDelete({ id, name, teacher, courseCode })}
                    />
                </View>
            </View>

            {/* Andre rad i flexboks: tekst */}
            <View style={styles.boxText}>
                <Text>{teacher}</Text>
            </View>


            {/* Tredje rad i flexboks: barchart */}
            {gradeDistribution && gradeDistribution[courseCode] && (
                <View style={styles.boxChart}>
                    <View style={styles.chartContainer}>
                        <Text style={styles.chartTitle}>Grade Distribution</Text>
                        <BarChart
                            data={{
                                labels: ['A', 'B', 'C', 'D', 'E', 'F'],
                                datasets: [
                                    {
                                        data: [
                                            getGradeValue('A'),
                                            getGradeValue('B'),
                                            getGradeValue('C'),
                                            getGradeValue('D'),
                                            getGradeValue('E'),
                                            getGradeValue('F')
                                        ]
                                    }
                                ]
                            }}
                            width={300}
                            height={180}
                            yAxisSuffix=""
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => `rgba(0, 0, 255, ${opacity})`,
                                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                propsForLabels: {
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                },
                                propsForBackgroundLines: {
                                    strokeDasharray: '', // Use solid lines
                                },
                                yAxisInterval: 1,
                                barPercentage: 0.7, // Makes bars wider
                                // Set a fixed maximum for the y-axis
                                count: 6, // Ensure all 6 grade labels are shown
                                formatYLabel: (value) => Math.floor(value).toString(), // Integer y-values
                                // Create a Y-axis with appropriate max value
                                yAxisMax: calculateYAxisMax(),
                            }}
                            style={{
                                marginVertical: 8,
                                borderRadius: 16,
                                paddingRight: 0, // Reduce right padding to show more of the chart
                            }}
                            showValuesOnTopOfBars={true} // Optional: shows the values on top of bars
                            fromZero={true} // Start Y axis from zero
                            withHorizontalLabels={true}
                            withVerticalLabels={true}
                            verticalLabelRotation={0} // Keep labels horizontal
                            horizontalLabelRotation={0}
                        />
                    </View>
                </View>
            )}
        </View>
    );
};


const ManageCourseApp = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState<string>(''); // State for søketekst
    const [modalVisible, setModalVisible] = useState(false);
    const [savingSubject, setSavingSubject] = useState(false);
    const [editSubject, setEditSubject] = useState<ItemProps | null>(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [subjectDelete, setSubjectDelete] = useState<any>(null);
    const [gradeDistributions, setGradeDistributions] = useState<{[key: string]: {[key: string]: number}}>({});


    useEffect(() => {
        fetchSubjects();
        fetchGradeDistributions();
    }, []);

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    // Filtrere dataene basert på kursets navn
    const filteredData = data.filter(
        (item) =>
            item.name.toLowerCase().includes(searchText.toLowerCase()) // Søk på course navn
    );

    // Henter studentdata
    const fetchSubjects = async () => {
        try {
            // Hent data fra Firestore
            const querySnapshot = await getDocs(collection(db, 'subjects')); // Kall på Firestore
            const list = querySnapshot.docs.map((doc) => ({
                id: doc.id,
                name: doc.data().name,
                teacher: doc.data().teacher,
                courseCode: doc.data().courseCode,
            }));
            setData(list);
        } catch (error) {
            console.error('Feil ved henting av data fra Firestore:', error);
        } finally {
            setLoading(false);
        }
    };

    // Henter og kalkulerer karakterfordelingen
    const fetchGradeDistributions = async () => {
        try {
            //Henter først alle subjects
            const subjectsSnapshot = await getDocs(collection(db, 'subjects'));
            const subjectData = subjectsSnapshot.docs.map(doc => ({
                id: doc.id,
                courseCode: doc.data().courseCode
            }));

            //Henter alle studentene
            const studentsSnapshot = await getDocs(collection(db, 'students'));

            // Initialiserer fordelings-objektet
            const distributions: { [key: string]: { [key: string]: number } } = {};

            // Initialiserer med 0 for alle mulige karakterer for hvert fag
            subjectData.forEach(subject => {
                distributions[subject.courseCode] = {
                    'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0
                };
            });

            // Prosesserer hver students karakter
            const studentPromises = studentsSnapshot.docs.map(async (studentDoc) => {
                const studentId = studentDoc.id;

                // Henter alle karakterene for denne studenten
                const gradesSnapshot = await getDocs(collection(db, 'students', studentId, 'grades'));

                // Prosesserer hver karakter
                gradesSnapshot.docs.forEach(gradeDoc => {
                    const gradeData = gradeDoc.data();
                    const subject = gradeData.subject;
                    const grade = gradeData.grade.toUpperCase();

                    // Ikrementerer tellingen for denne karakteren i dette faget
                    if (distributions[subject] && ['A', 'B', 'C', 'D', 'E', 'F'].includes(grade)) {
                        distributions[subject][grade]++;
                    }
                });
            });

            // Venter for all prosessering av studentkarakterer til å bli ferdig
            await Promise.all(studentPromises);

            setGradeDistributions(distributions);
        } catch (error) {
            console.error('Error fetching grades', error);
        }
    };

    // Ny subject form
    const [newSubject, setNewSubject] = useState<{
        id?: string;  // Gjør id valgfritt
        name: string;
        teacher: string;
        courseCode: string;
    }>({
        name: '',
        teacher: '',
        courseCode: '',
    });

    const handleInputChange = (field: keyof typeof newSubject, value: string) => {
        setNewSubject(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleEditPress = (subject: ItemProps) => {
        setNewSubject(subject);  // Fyll inn eksisterende data
        setEditSubject(subject);  // Marker at vi redigerer
        setModalVisible(true);
    };

    const handleDeletePress = (subject: ItemProps) => {
        setSubjectDelete(subject);  // Sett det valgte faget
        setDeleteModalVisible(true);  // Vis slettemodal
    };


    const resetForm = () => {
        setNewSubject({
            name: '',
            teacher: '',
            courseCode: ''
        });
    };

    const saveSubject = async () => {
        if (!newSubject.name.trim() || !newSubject.teacher.trim() || !newSubject.courseCode.trim()) {
            Alert.alert("Missing information", "Please provide name, teacher, and course code.");
            return;
        }

        try {
            setSavingSubject(true);

            if (editSubject && newSubject.id) {
                // Oppdaterer eksisterende fag
                const { id, ...subjectData } = newSubject; // Fjern 'id' fra oppdateringen
                await updateDoc(doc(db, "subjects", newSubject.id), subjectData);
            } else {
                // Legg til nytt fag
                const subjectsCollectionRef = collection(db, "subjects");
                await addDoc(subjectsCollectionRef, newSubject);
            }

            setModalVisible(false);
            resetForm();
            setEditSubject(null);
            fetchSubjects();

            Alert.alert("Success", editSubject ? "Subject updated successfully." : "Subject added successfully.");
        } catch (error) {
            console.error("Error saving subject", error);
            Alert.alert("Error", "Failed to save subject, please try again.");
        } finally {
            setSavingSubject(false);
        }
    };

    const deleteSubject = async () => {
        if (subjectDelete) {
            try {
                // Hent alle studenter
                const studentsRef = collection(db, "students");
                const studentsSnapshot = await getDocs(studentsRef);

                // Iterer gjennom studentene for å finne og slette karakterer i dette faget
                const deleteGradePromises = studentsSnapshot.docs.map(async (studentDoc) => {
                    const studentId = studentDoc.id;

                    // Hent karakterer for dette faget under hver student
                    const gradesRef = collection(db, "students", studentId, "grades");
                    const q = query(gradesRef, where("subject", "==", subjectDelete.courseCode));
                    const gradesSnapshot = await getDocs(q);

                    // Slett karakterene for dette faget
                    const deletePromises = gradesSnapshot.docs.map(gradeDoc =>
                        deleteDoc(doc(db, "students", studentDoc.id, "grades", gradeDoc.id))
                    );

                    return Promise.all(deletePromises);
                });

                // Vent for alle slettinger av karakterer til å fullføre
                await Promise.all(deleteGradePromises);

                // Sletter faget fra Firestore
                await deleteDoc(doc(db, "subjects", subjectDelete.id));

                setDeleteModalVisible(false);  // Skjul modal etter sletting
                fetchSubjects();  // Oppdater listen etter sletting
                fetchGradeDistributions();
                Alert.alert("Success", "Subject deleted.");
            } catch (error) {
                Alert.alert("Error", "Failed to delete subject.");
            }
        }
    };

    const chartConfig = {
        backgroundGradientFrom: "#1E2923",
        backgroundGradientFromOpacity: 0,
        backgroundGradientTo: "#08130D",
        backgroundGradientToOpacity: 0.5,
        color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
        strokeWidth: 2, // optional, default 3
        barPercentage: 0.5,
        useShadowColorFromDataset: false // optional
    };

//-------------------------------SE GJENNOM HTML SEKSJONEN--------------------------------------\\

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
                    placeholder="Search course..."
                />

                {/* Add knapp */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >

                    <Text style={styles.addButtonText}>+ Add Subject</Text>
                </TouchableOpacity>

                {/* Modal for add/edit subject */}
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
                                {editSubject ? "Edit Subject" : "Add New Subject"} {/*Viser edit eller add etter hva som ble trykket på*/}
                            </Text>

                            <ScrollView style={styles.formContainer}>
                                <Text style={styles.inputLabel}>Name *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter course name"
                                    value={newSubject.name}
                                    onChangeText={(text) => handleInputChange('name', text)}
                                />

                                <Text style={styles.inputLabel}>Course Code *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter course code"
                                    value={newSubject.courseCode}
                                    onChangeText={(text) => handleInputChange('courseCode', text)}
                                />

                                <Text style={styles.inputLabel}>Teacher *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter teacher"
                                    value={newSubject.teacher}
                                    onChangeText={(text) => handleInputChange('teacher', text)}
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
                                    onPress={saveSubject}
                                    disabled={savingSubject}
                                >
                                    {savingSubject ? (
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

                            <Text style={styles.inputLabel}>Are you sure you want to delete this subject?</Text>
                            {subjectDelete && (
                                <View>
                                    <Text>{`${subjectDelete.name}`}</Text>
                                    <Text>{subjectDelete.courseCode}</Text>
                                    <Text>{subjectDelete.teacher}</Text>
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
                                    onPress={deleteSubject}  // Kall på slett-funksjonen
                                >
                                    <Text style={styles.saveButtonText}>Delete</Text>
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
                            name={item.name}
                            courseCode={item.courseCode}
                            teacher={item.teacher}
                            onEdit={handleEditPress}
                            onDelete={handleDeletePress}
                            gradeDistribution={gradeDistributions} />
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
        marginTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
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
        flex: 1,
    },
    input: {
        height: 40,
        marginVertical: 12,
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
    chartContainer: {
        marginTop: 15,
        alignItems: 'center',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 5,
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
        flexDirection: 'row',
        gap: 10,
        alignSelf: 'flex-end',
    },
    boxText: {
        marginBottom: 10,
    },
    boxChart: {
        padding: 10,
        alignItems: 'center',
        marginTop: 15,
    },
});

export default ManageCourseApp;
