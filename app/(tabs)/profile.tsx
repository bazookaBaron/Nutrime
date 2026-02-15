import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert } from 'react-native';
import { useUser } from '../../context/UserContext';
import { useRouter } from 'expo-router';
import { Settings, Edit2, Bell, ChevronRight, User, Moon, Lock, LogOut, Award, Star, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ProfileScreen() {
    const { userProfile, nutritionTargets, logout } = useUser();
    const router = useRouter();
    const [isDarkMode, setIsDarkMode] = useState(false);

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
                        router.replace('/auth/login');
                    }
                }
            ]
        );
    };

    // Calculate BMI
    const weight = userProfile?.weight || 75;
    const height = userProfile?.height || 180;
    const bmi = (weight / ((height / 100) * (height / 100))).toFixed(1);

    // Calorie Consumed (Mock for now or pass from somewhere else, but let's just use what we have or mock it visually since specific data might be on dashboard)
    // Actually we can use the target from context
    const targetCalories = nutritionTargets.calories || 2200;
    const consumedMock = 1980; // We might want to pull real data later, but for UI match let's use a meaningful placeholder or calculate if we have access to dailyLog here. 
    // Accessing dailyLog here would require FoodContext. Let's keep it simple for now and maybe just show the target.
    // The screenshot shows "1980 consumed", "220 left".

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                    {/* Back button logic or just empty if it's a tab, tabs usually don't have back unless nav stack. 
                 Screenshot has back arrow. If it's a tab, maybe it shouldn't have back? 
                 But user asked for tab "on right most like the user profile ui showed". 
                 Tabs usually are top level. I'll put a spacer or a minimal back if inside stack.
                 Actually, simpler to just have the "Profile" title centered.
             */}
                    {/* <ChevronLeft size={24} color="#1f2937" /> */}
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Profile</Text>
                <TouchableOpacity style={styles.iconButton}>
                    <Bell size={24} color="#1f2937" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Info */}
                <View style={styles.profileSection}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                            style={styles.avatar}
                        />
                        <TouchableOpacity style={styles.editBadge}>
                            <Edit2 size={12} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{userProfile?.full_name || 'Sajibur Rahman'}</Text>
                    <Text style={styles.userEmail}>{userProfile?.email || 'sajibur.ui@gmail.com'}</Text>
                </View>

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconBg, { backgroundColor: '#dbeafe' }]}>
                            <Text style={{ fontSize: 14, color: '#3b82f6' }}>⚖️</Text>
                        </View>
                        <Text style={styles.statLabel}>Weight</Text>
                        <Text style={styles.statValue}>{weight} <Text style={styles.statUnit}>kg</Text></Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconBg, { backgroundColor: '#f3e8ff' }]}>
                            <Text style={{ fontSize: 14, color: '#a855f7' }}>📏</Text>
                        </View>
                        <Text style={styles.statLabel}>Height</Text>
                        <Text style={styles.statValue}>{height} <Text style={styles.statUnit}>cm</Text></Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: '#bef264' }]}>
                        <View style={[styles.statIconBg, { backgroundColor: 'rgba(255,255,255,0.5)' }]}>
                            <Text style={{ fontSize: 14, color: '#1f2937' }}>💪</Text>
                        </View>
                        <Text style={[styles.statLabel, { color: '#1f2937' }]}>BMI</Text>
                        <Text style={[styles.statValue, { color: '#1f2937' }]}>{bmi}</Text>
                    </View>
                </View>

                {/* Daily Calorie Goal */}
                <Text style={styles.sectionTitle}>DAILY CALORIE GOAL</Text>
                <View style={styles.calorieCard}>
                    <View style={styles.calorieHeader}>
                        <View style={styles.fireIconBg}>
                            <Flame size={20} color="#bef264" fill="#bef264" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.calTargetLabel}>Target Calories</Text>
                            <Text style={styles.calTargetValue}>{targetCalories} <Text style={styles.calUnit}>kCal</Text></Text>
                        </View>
                        <Text style={styles.complianceText}>90%</Text>
                    </View>

                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '90%' }]} />
                    </View>
                    <View style={styles.calFooter}>
                        <Text style={styles.calFooterText}>{Math.round(targetCalories * 0.9)} kcal consumed</Text>
                        <Text style={styles.calFooterText}>{Math.round(targetCalories * 0.1)} kcal left</Text>
                    </View>
                </View>

                {/* User Ranking */}
                <View style={styles.rankingCard}>
                    <View style={styles.rankIconContainer}>
                        <Award size={24} color="#1f2937" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.rankTitle}>User Ranking: <Text style={{ fontWeight: 'bold' }}>Top 2%</Text> of users</Text>
                        <Text style={styles.rankSub}>You are among the most consistent health trackers globally!</Text>
                    </View>
                </View>

                {/* Premium Access */}
                <LinearGradient
                    colors={['#d9f99d', '#bef264']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.premiumCard}
                >
                    <View style={styles.premiumHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.premiumTitle}>Get Premium Access</Text>
                            <Text style={styles.premiumSub}>Custom meal plans & advanced analytics to reach your goals faster.</Text>
                        </View>
                        <View style={styles.starIconBg}>
                            <Star size={20} color="#1f2937" fill="#1f2937" />
                        </View>
                    </View>
                    <TouchableOpacity style={styles.upgradeBtn}>
                        <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
                    </TouchableOpacity>
                </LinearGradient>

                {/* Account Section */}
                <Text style={styles.sectionTitle}>ACCOUNT</Text>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconBg}>
                        <User size={20} color="#6b7280" />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuTitle}>Personal Information</Text>
                        <Text style={styles.menuSub}>Edit your profile details</Text>
                    </View>
                    <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>

                {/* Settings Section */}
                <Text style={styles.sectionTitle}>SETTINGS</Text>

                <View style={styles.menuItem}>
                    <View style={styles.menuIconBg}>
                        <Moon size={20} color="#6b7280" />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuTitle}>Display Mode</Text>
                        <Text style={styles.menuSub}>Light / Dark theme</Text>
                    </View>
                    <Switch
                        value={isDarkMode}
                        onValueChange={setIsDarkMode}
                        trackColor={{ false: "#e5e7eb", true: "#bef264" }}
                        thumbColor={"#fff"}
                    />
                </View>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={styles.menuIconBg}>
                        <Lock size={20} color="#6b7280" />
                    </View>
                    <View style={styles.menuTextContainer}>
                        <Text style={styles.menuTitle}>Privacy Policy</Text>
                        <Text style={styles.menuSub}>Data protection</Text>
                    </View>
                    <ChevronRight size={20} color="#9ca3af" />
                </TouchableOpacity>

                {/* Logout */}
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <LogOut size={20} color="#ef4444" style={{ marginRight: 10 }} />
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
        backgroundColor: '#f9fafb',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 80,
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#fff',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#bef264',
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: '#6b7280',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 15,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    statIconBg: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#9ca3af',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    statUnit: {
        fontSize: 12,
        color: '#9ca3af',
        fontWeight: 'normal',
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9ca3af',
        marginBottom: 10,
        letterSpacing: 1,
    },
    calorieCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    calorieHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    fireIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f7fee7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calTargetLabel: {
        fontSize: 12,
        color: '#9ca3af',
    },
    calTargetValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    calUnit: {
        fontSize: 14,
        color: '#9ca3af',
        fontWeight: 'normal',
    },
    complianceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#84cc16',
    },
    progressBarBg: {
        height: 10,
        backgroundColor: '#f3f4f6',
        borderRadius: 5,
        marginBottom: 10,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#bef264',
        borderRadius: 5,
    },
    calFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    calFooterText: {
        fontSize: 12,
        color: '#9ca3af',
    },
    rankingCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    rankIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#bef264',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankTitle: {
        fontSize: 14,
        color: '#4b5563',
        marginBottom: 4,
    },
    rankSub: {
        fontSize: 12,
        color: '#9ca3af',
        lineHeight: 16,
    },
    premiumCard: {
        borderRadius: 24,
        padding: 20,
        marginBottom: 30,
    },
    premiumHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    premiumTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 5,
    },
    premiumSub: {
        fontSize: 12,
        color: '#4b5563',
        lineHeight: 18,
    },
    starIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    upgradeBtn: {
        backgroundColor: '#000',
        paddingVertical: 12,
        borderRadius: 30,
        alignItems: 'center',
    },
    upgradeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    menuItem: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    menuIconBg: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f3f4f6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
    menuSub: {
        fontSize: 12,
        color: '#9ca3af',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        marginTop: 10,
        marginBottom: 30,
        backgroundColor: '#fef2f2',
        borderRadius: 20,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ef4444',
    },
});
