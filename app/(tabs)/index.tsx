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
import { StatusBar } from 'expo-status-bar';

// Import Firebase functions (v9+ modular SDK)
import { db } from '@/firebaseConfig'; // Importer Firestore DB
import {addDoc, collection, getDocs} from 'firebase/firestore'; // Importer nødvendige Firestore-funksjoner
import {FontAwesome6} from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ScrollView = Animated.ScrollView;
import {Simulate} from "react-dom/test-utils";
import reset = Simulate.reset;

type ItemProps = { fName: string, lName: string, email: string, studentId: string };

const Item = ({ fName, lName, email, studentId }: ItemProps) => (
    <View style={styles.item}>
        <Text style={styles.title}>{`${fName} ${lName}`}</Text>
        <Text>{email}</Text>
        <Text>{studentId}</Text>
        <FontAwesome6 name={"edit"} size={24} color={"black"} style={styles.editIcon}/>
        <AntDesign name={"delete"} size={24} color={"black"} style={styles.deleteIcon}/>
    </View>
);

const HelloWorldApp = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState<string>(''); // State for søketekst
    const [modalVisible, setModalVisible] = useState(false);
    const [savingStudent, setSavingStudent] = useState(false);

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
    const [newStudent, setNewStudent] = useState({
        fName: '',
        lName: '',
        email: '',
        studentId: '',

    });

    const handleInputChange = (field, value) => {
        setNewStudent(prev => ({
            ...prev,
            [field]: value,
        }));
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
        // Validate form
        if (newStudent.fName.trim() && !newStudent.lName.trim() || !newStudent.studentId.trim()) {
            Alert.alert("Missing information", "Please provide first name, last name, and student ID.");
            return;
        }

        if (newStudent.email.trim() && !newStudent.email.includes('@')) {
            Alert.alert("Invalid E-mail", "Please provide a valid E-mail address.");
            return;
        }

        try {
            setSavingStudent(true);

            // Referanse til students collection
            const studentsCollectionRef = collection(db, "students");

            // Legger til nytt student dokument
            await addDoc(studentsCollectionRef, newStudent);

            // Lukker modal og reset form
            setModalVisible(false);
            resetForm();

            // Refresher studentlisten
            fetchStudents();

            Alert.alert("Success", "Student added successfully.");
        } catch (error) {
            console.error("Error adding student", error);
            Alert.alert("Error", "Failed to add student, please try again.");
        } finally {
            setSavingStudent(false);
        }
    };

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

                {/* Add Student modal */}
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
                            <Text style={styles.modalTitle}>Add New Student</Text>

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

                {/* FlatList med filtrerte data */}
                <FlatList
                    data={filteredData}
                    renderItem={({ item }) => (
                        <Item fName={item.fName} lName={item.lName} email={item.email} studentId={item.studentId} />
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
});

export default HelloWorldApp;
