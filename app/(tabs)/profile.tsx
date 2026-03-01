import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { useChallenges } from '../../context/ChallengesContext';
import { useRouter } from 'expo-router';
import { Edit2, Bell, ChevronRight, User, Lock, Award, Star, Flame, Trophy, Zap, Crown, FileText, Info, HelpCircle, Inbox } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { usePostHog } from 'posthog-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function ProfileScreen() {
    const { user, userProfile, logout } = useUser();
    const { userChallenges } = useChallenges();
    const router = useRouter();
    const posthog = usePostHog();

    const handleLogout = async () => {
        Alert.alert(
            "Log Out",
            "Are you sure you want to log out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Log Out",
                    style: 'destructive',
                    onPress: async () => {
                        posthog.capture('user_logged_out', {
                            user_id: user?.id,
                            workout_level: userProfile?.workout_level,
                            total_xp: userProfile?.workout_xp,
                        });
                        posthog.reset();
                        await logout();
                    }
                }
            ]
        );
    };

    // Calculate Stats
    const weight = userProfile?.weight || '--';
    const height = userProfile?.height || '--';

    let bmi = '--';
    if (weight !== '--' && height !== '--') {
        const hM = Number(height) / 100;
        bmi = (Number(weight) / (hM * hM)).toFixed(1);
    }

    const completedChallengesCount = userChallenges?.filter((uc: any) => uc.status === 'completed').length || 0;
    const currentLevel = userProfile?.workout_level || 1;
    const displayXp = userProfile?.xp || userProfile?.workout_xp || 0;

    const generateUploadUrl = useMutation(api.users.generateUploadUrl);
    const updateProfileImage = useMutation(api.users.updateProfileImage);
    const [isUploading, setIsUploading] = useState(false);
    const [feedbackType, setFeedbackType] = useState<'Feature' | 'Bug'>('Feature');
    const [feedbackText, setFeedbackText] = useState('');

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled && result.assets[0].uri) {
            await uploadImage(result.assets[0].uri);
        }
    };

    const uploadImage = async (uri: string) => {
        try {
            setIsUploading(true);
            const uploadUrl = await generateUploadUrl();

            const response = await fetch(uri);
            const blob = await response.blob();

            const uploadResult = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": blob.type },
                body: blob,
            });

            const { storageId } = await uploadResult.json();

            if (user?.id) {
                await updateProfileImage({
                    userId: user.id,
                    storageId,
                });
            }
        } catch (error) {
            console.error("Failed to upload image:", error);
            Alert.alert("Upload Failed", "Could not upload your profile picture. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmitFeedback = () => {
        if (!feedbackText.trim()) {
            Alert.alert("Required", "Please enter your feedback to submit.");
            return;
        }
        // Placeholder for future mail implementation
        Alert.alert("Feedback Sent", `Your ${feedbackType.toLowerCase()} has been sent to our team. Thank you!`);
        setFeedbackText('');
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Info */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: userProfile?.profile_image_url || 'https://i.pravatar.cc/150?img=12' }}
                            style={[styles.avatar, isUploading && { opacity: 0.5 }]}
                        />
                        <TouchableOpacity style={styles.editBadge} onPress={handlePickImage} disabled={isUploading}>
                            <Edit2 size={12} color="#000" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{userProfile?.full_name || 'User Name'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
                </View>

                {/* Main Stats Row (Level, XP, Challenges) */}
                <View style={styles.mainStatsContainer}>
                    <View style={styles.mainStatItem}>
                        <View style={[styles.mainStatIcon, { backgroundColor: 'rgba(234, 179, 8, 0.1)' }]}>
                            <Crown size={20} color="#eab308" />
                        </View>
                        <Text style={styles.mainStatValue}>{currentLevel}</Text>
                        <Text style={styles.mainStatLabel}>Level</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.mainStatItem}>
                        <View style={[styles.mainStatIcon, { backgroundColor: 'rgba(190, 242, 100, 0.1)' }]}>
                            <Zap size={20} color="#bef264" />
                        </View>
                        <Text style={styles.mainStatValue}>{displayXp}</Text>
                        <Text style={styles.mainStatLabel}>Total XP</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.mainStatItem}>
                        <View style={[styles.mainStatIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Trophy size={20} color="#ef4444" />
                        </View>
                        <Text style={styles.mainStatValue}>{completedChallengesCount}</Text>
                        <Text style={styles.mainStatLabel}>Challenges</Text>
                    </View>
                </View>

                {/* Physical Stats */}
                <Text style={styles.sectionTitle}>PHYSICAL STATS</Text>
                <View style={styles.physicalStatsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Weight</Text>
                        <Text style={styles.statValue}>{weight} <Text style={styles.statUnit}>kg</Text></Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Height</Text>
                        <Text style={styles.statValue}>{height} <Text style={styles.statUnit}>cm</Text></Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>BMI</Text>
                        <Text style={[styles.statValue, { color: '#bef264' }]}>{bmi}</Text>
                    </View>
                </View>


                {/* Account Section */}
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/privacy')}>
                        <View style={styles.menuIconContainer}>
                            <FileText size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Privacy Policy</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/terms')}>
                        <View style={styles.menuIconContainer}>
                            <Lock size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Terms of Service</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/about')}>
                        <View style={styles.menuIconContainer}>
                            <Info size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>About Us</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />

                    <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/support')}>
                        <View style={styles.menuIconContainer}>
                            <HelpCircle size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Contact / Support</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                </View>

                {/* Feedback Panel */}
                <Text style={styles.sectionTitle}>FEEDBACK</Text>
                <View style={styles.feedbackContainer}>
                    <View style={styles.feedbackToggleRow}>
                        <TouchableOpacity
                            style={[styles.feedbackToggleBtn, feedbackType === 'Feature' && styles.feedbackToggleActive]}
                            onPress={() => setFeedbackType('Feature')}
                        >
                            <Text style={[styles.feedbackToggleText, feedbackType === 'Feature' && styles.feedbackToggleTextActive]}>Request Feature</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.feedbackToggleBtn, feedbackType === 'Bug' && styles.feedbackToggleActive]}
                            onPress={() => setFeedbackType('Bug')}
                        >
                            <Text style={[styles.feedbackToggleText, feedbackType === 'Bug' && styles.feedbackToggleTextActive]}>Report a Bug</Text>
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={styles.feedbackInput}
                        placeholder={feedbackType === 'Feature' ? "What should we build next?" : "Describe the issue you encountered..."}
                        placeholderTextColor="#6b7280"
                        multiline
                        textAlignVertical="top"
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                    />
                    <TouchableOpacity style={styles.feedbackSubmitBtn} onPress={handleSubmitFeedback}>
                        <Inbox size={18} color="#000" style={{ marginRight: 8 }} />
                        <Text style={styles.feedbackSubmitText}>Send {feedbackType}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1f2937',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatar: {
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 3,
        borderColor: '#bef264',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#bef264',
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#111827',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#9ca3af',
    },
    mainStatsContainer: {
        flexDirection: 'row',
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#374151',
    },
    mainStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    mainStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    mainStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 2,
    },
    mainStatLabel: {
        fontSize: 11,
        color: '#9ca3af',
    },
    divider: {
        width: 1,
        backgroundColor: '#374151',
        height: '80%',
        alignSelf: 'center',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#6b7280',
        marginBottom: 12,
        letterSpacing: 1,
        marginTop: 8,
    },
    physicalStatsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151',
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 8,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    statUnit: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'normal',
    },
    menuContainer: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#374151',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    menuText: {
        flex: 1,
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },
    menuDivider: {
        height: 1,
        backgroundColor: '#374151',
        marginLeft: 60,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ef4444',
    },
    feedbackContainer: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#374151',
    },
    feedbackToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    feedbackToggleBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    feedbackToggleActive: {
        backgroundColor: '#374151',
    },
    feedbackToggleText: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '600',
    },
    feedbackToggleTextActive: {
        color: '#bef264',
    },
    feedbackInput: {
        backgroundColor: '#111827',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        height: 120,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#374151',
    },
    feedbackSubmitBtn: {
        backgroundColor: '#bef264',
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    feedbackSubmitText: {
        color: '#111827',
        fontSize: 16,
        fontWeight: 'bold',
    }
});
