import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '../../context/UserContext';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { COUNTRIES, LocationEntry } from '../../data/locations';
import LocationPicker from '../../components/LocationPicker';

export default function Step2Stats() {
    const [weight, setWeight] = useState('');
    const [height, setHeight] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('male'); // default
    const [country, setCountry] = useState('');
    const [state, setState] = useState('');

    // Dynamically compute available states when country changes
    const selectedCountryEntry = useMemo<LocationEntry | undefined>(
        () => COUNTRIES.find(c => c.value === country),
        [country]
    );
    const availableStates = selectedCountryEntry?.states || [];
    const hasStates = availableStates.length > 0;

    const { updateProfile } = useUser();
    const router = useRouter();

    const handleNext = () => {
        if (weight && height && age && country) {
            updateProfile({ weight, height, age, gender, country, state });
            router.push('/onboarding/step3_activity');
        }
    };

    const isFormValid = weight && height && age && country;

    // When country changes, clear the state if it was set
    const handleCountrySelect = (val: string) => {
        setCountry(val);
        setState('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step 2 of 4</Text>
                <Text style={styles.skipText}>    </Text>
            </View>

            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: '50%' }]} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Tell us about yourself</Text>
                <Text style={styles.subtitle}>These help us calculate your body needs.</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Gender</Text>
                    <View style={styles.genderContainer}>
                        <TouchableOpacity
                            style={[styles.genderButton, gender === 'male' && styles.genderButtonSelected]}
                            onPress={() => setGender('male')}
                        >
                            <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genderButton, gender === 'female' && styles.genderButtonSelected]}
                            onPress={() => setGender('female')}
                        >
                            <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>Female</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="70"
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={weight}
                        onChangeText={setWeight}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Height (cm)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="175"
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={height}
                        onChangeText={setHeight}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Age</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="25"
                        placeholderTextColor="#6b7280"
                        keyboardType="numeric"
                        value={age}
                        onChangeText={setAge}
                    />
                </View>

                <LocationPicker
                    label="Country"
                    placeholder="Select your country"
                    value={country}
                    options={COUNTRIES}
                    onSelect={handleCountrySelect}
                />

                {hasStates && (
                    <LocationPicker
                        label="State / Province"
                        placeholder="Select your state"
                        value={state}
                        options={availableStates}
                        onSelect={setState}
                    />
                )}

                {!hasStates && country && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>State / Province (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g., Region"
                            value={state}
                            onChangeText={setState}
                        />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.button, !isFormValid && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={!isFormValid}
                >
                    <Text style={[styles.buttonText, !isFormValid && { color: '#6b7280' }]}>Continue</Text>
                    <ArrowRight size={20} color={!isFormValid ? '#6b7280' : '#000'} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    backButton: {
        padding: 8,
    },
    stepText: {
        fontSize: 14,
        color: '#6b7280',
        fontWeight: '600',
    },
    skipText: {
        fontSize: 14,
        color: '#6b7280',
    },
    progressBar: {
        height: 4,
        backgroundColor: '#1a1a1a',
        marginHorizontal: 20,
        borderRadius: 2,
        marginBottom: 30,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#bef264',
        borderRadius: 2,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#6b7280',
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    genderButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
    },
    genderButtonSelected: {
        borderColor: '#bef264',
        backgroundColor: 'rgba(190, 242, 100, 0.05)',
    },
    genderText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#9ca3af',
    },
    genderTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#0a0a0a',
        borderTopWidth: 1,
        borderTopColor: '#1a1a1a',
    },
    button: {
        backgroundColor: '#bef264',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    buttonDisabled: {
        backgroundColor: '#1a1a1a',
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
