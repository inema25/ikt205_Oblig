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
import {addDoc, collection, deleteDoc, doc, getDocs, updateDoc} from 'firebase/firestore'; // Importer nødvendige Firestore-funksjoner
import {FontAwesome6} from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import ScrollView = Animated.ScrollView;
import barChart from 'react-native-chart-kit'; // npm i react-native-chart-kit
//import {Simulate} from "react-dom/test-utils";
//import reset = Simulate.reset;

type ItemProps = {
    id: string,
    name: string,
    courseCode: string,
    teacher: string,
    onEdit: (subject: any) => void;
    onDelete: (subject: any) => void;
};

const Item = ({ id, name, teacher, courseCode, onEdit, onDelete }: ItemProps) => (
    <View style={styles.item}>
        <Text style={styles.title}>{`${courseCode} ${name}`}</Text>
        <Text>{teacher}</Text>
        <FontAwesome6
            name={"edit"}
            size={24}
            color={"black"}
            style={styles.editIcon}
            onPress={() => onEdit({ id, name, teacher, courseCode })}
        />
        <AntDesign
            name={"delete"}
            size={24}
            color={"black"}
            style={styles.deleteIcon}
            onPress={() => onDelete({ id, name, teacher, courseCode})}
        />
    </View>
);

const ManageCourseApp = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchText, setSearchText] = useState<string>(''); // State for søketekst
    const [modalVisible, setModalVisible] = useState(false);
    const [savingSubject, setSavingSubject] = useState(false);
    const [editSubject, setEditSubject] = useState(null);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [subjectDelete, setSubjectDelete] = useState<any>(null);


    useEffect(() => {
        fetchSubjects();
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

    const handleInputChange = (field, value) => {
        setNewSubject(prev => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleEditPress = (subject) => {
        setNewSubject(subject);  // Fyll inn eksisterende data
        setEditSubject(subject);  // Marker at vi redigerer
        setModalVisible(true);
    };

    const handleDeletePress = (subject) => {
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

            if (editSubject) {
                // Oppdaterer eksisterende fag
                const { id, ...subjectData } = newSubject; // Fjern 'id' fra oppdateringen
                await updateDoc(doc(db, "subjects", id), subjectData);
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
                // Sletter faget fra Firestore
                await deleteDoc(doc(db, "subjects", subjectDelete.id));
                setDeleteModalVisible(false);  // Skjul modal etter sletting
                fetchSubjects();  // Oppdater listen etter sletting
                Alert.alert("Success", "Subject deleted.");
            } catch (error) {
                Alert.alert("Error", "Failed to delete subject.");
            }
        }
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
                    placeholder="Søk etter student..."
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
                                    keyboardType="number-pad"
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
                            onDelete={handleDeletePress} />
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

export default ManageCourseApp;
