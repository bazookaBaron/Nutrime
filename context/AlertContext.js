import React, { createContext, useContext, useState, useCallback } from 'react';

const AlertContext = createContext();

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within an AlertProvider');
    }
    return context;
};

export const AlertProvider = ({ children }) => {
    const [alertConfig, setAlertConfig] = useState({
        visible: false,
        title: '',
        message: '',
        buttons: []
    });

    const showAlert = useCallback((title, message, buttons = []) => {
        setAlertConfig({
            visible: true,
            title,
            message,
            buttons: buttons.length > 0 ? buttons : [{ text: 'OK', onPress: () => { } }]
        });
    }, []);

    const hideAlert = useCallback(() => {
        setAlertConfig(prev => ({ ...prev, visible: false }));
    }, []);

    return (
        <AlertContext.Provider value={{ showAlert, hideAlert, alertConfig }}>
            {children}
        </AlertContext.Provider>
    );
};
