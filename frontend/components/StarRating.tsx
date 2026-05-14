import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    size?: number;
    disabled?: boolean;
}

export const StarRating: React.FC<StarRatingProps> = ({ rating, onRatingChange, size = 24, disabled = true }) => {
    return (
        <View style={styles.container}>
            {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                    key={star}
                    disabled={disabled}
                    onPress={() => onRatingChange && onRatingChange(star)}
                >
                    <MaterialIcons
                        name={star <= rating ? "star" : "star-border"}
                        size={size}
                        color={star <= rating ? "#f59e0b" : "#d1d5db"} // Taronja si està activa, gris si no
                    />
                </TouchableOpacity>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 4,
    }
});