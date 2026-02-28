import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, FlatList,
    TextInput, SafeAreaView, Platform,
} from 'react-native';
import { ChevronDown, Search, X, Check, MapPin } from 'lucide-react-native';

export interface PickerOption {
    label: string;
    value: string;
}

interface LocationPickerProps {
    label: string;
    placeholder?: string;
    value: string;
    options: PickerOption[];
    onSelect: (value: string) => void;
    disabled?: boolean;
}

export default function LocationPicker({
    label,
    placeholder = 'Select...',
    value,
    options,
    onSelect,
    disabled = false,
}: LocationPickerProps) {
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');

    const selectedLabel = useMemo(
        () => options.find(o => o.value === value)?.label || '',
        [options, value]
    );

    const filtered = useMemo(() =>
        options.filter(o =>
            o.label.toLowerCase().includes(search.toLowerCase())
        ),
        [options, search]
    );

    const handleClose = () => {
        setVisible(false);
        setSearch('');
    };

    const handleSelect = (item: PickerOption) => {
        onSelect(item.value);
        handleClose();
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>{label}</Text>

            <TouchableOpacity
                style={[styles.selector, disabled && styles.selectorDisabled]}
                onPress={() => !disabled && setVisible(true)}
                activeOpacity={disabled ? 1 : 0.7}
            >
                <MapPin size={16} color={value ? '#fff' : '#9ca3af'} style={{ marginRight: 8 }} />
                <Text style={[styles.selectorText, !value && styles.placeholder]}>
                    {selectedLabel || placeholder}
                </Text>
                <ChevronDown size={18} color="#9ca3af" />
            </TouchableOpacity>

            <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
                <SafeAreaView style={styles.modal}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{label}</Text>
                        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                            <X size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <Search size={16} color="#9ca3af" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search..."
                            placeholderTextColor="#9ca3af"
                            value={search}
                            onChangeText={setSearch}
                            autoFocus
                        />
                        {search.length > 0 && (
                            <TouchableOpacity onPress={() => setSearch('')}>
                                <X size={16} color="#9ca3af" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* List */}
                    <FlatList
                        data={filtered}
                        keyExtractor={(item) => item.value}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        renderItem={({ item }) => {
                            const selected = item.value === value;
                            return (
                                <TouchableOpacity
                                    style={[styles.option, selected && styles.optionSelected]}
                                    onPress={() => handleSelect(item)}
                                >
                                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                                        {item.label}
                                    </Text>
                                    {selected && <Check size={18} color="#bef264" />}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.empty}>
                                <Text style={styles.emptyText}>No results found for "{search}"</Text>
                            </View>
                        }
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    selector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#2a2a2a',
        borderRadius: 12,
        padding: 16,
    },
    selectorDisabled: {
        opacity: 0.5,
    },
    selectorText: {
        flex: 1,
        fontSize: 16,
        color: '#fff',
    },
    placeholder: {
        color: '#9ca3af',
    },
    modal: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeBtn: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        margin: 16,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#fff',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    optionSelected: {
        backgroundColor: 'rgba(190, 242, 100, 0.05)',
    },
    optionText: {
        fontSize: 16,
        color: '#fff',
    },
    optionTextSelected: {
        color: '#bef264',
        fontWeight: '700',
    },
    empty: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 14,
    },
});
