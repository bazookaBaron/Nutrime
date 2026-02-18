import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert, SafeAreaView } from 'react-native';
import { useUser } from '../../context/UserContext';
import { useChallenges } from '../../context/ChallengesContext';
import { useRouter } from 'expo-router';
import { Settings, Edit2, Bell, ChevronRight, User, Moon, Lock, LogOut, Award, Star, Flame, Trophy, Zap, Crown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
    const { user, userProfile, logout } = useUser();
    const { userChallenges } = useChallenges();
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(true);

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

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={{ width: 40 }} />
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity style={styles.iconButton}>
                    <Settings size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Info */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editBadge}>
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
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <User size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Personal Information</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <Bell size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Notifications</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                    <View style={styles.menuDivider} />
                    <TouchableOpacity style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <Lock size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Privacy & Security</Text>
                        <ChevronRight size={20} color="#4b5563" />
                    </TouchableOpacity>
                </View>

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>SETTINGS</Text>
                <View style={styles.menuContainer}>
                    <View style={styles.menuItem}>
                        <View style={styles.menuIconContainer}>
                            <Moon size={20} color="#9ca3af" />
                        </View>
                        <Text style={styles.menuText}>Dark Mode</Text>
                        <Switch
                            value={isDarkMode}
                            onValueChange={setIsDarkMode}
                            trackColor={{ false: "#374151", true: "#bef264" }}
                            thumbColor={"#fff"}
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Log Out</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
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
});
