import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { NutrientTotals, NUTRIENT_META, RECOMMENDED_DAILY } from '../utils/analyticsUtils';

interface Props {
    actual: NutrientTotals;
    recommended?: Partial<NutrientTotals>;
    size?: number;
}

const CATEGORIES = NUTRIENT_META.map(n => n.key);
const LABELS = NUTRIENT_META.map(n => n.label);
const NUM_AXES = CATEGORIES.length; // 7
const ANGLE_STEP = (2 * Math.PI) / NUM_AXES;
// Start at top (-90°)
const START_ANGLE = -Math.PI / 2;

function polarToXY(angle: number, r: number, cx: number, cy: number) {
    return {
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
    };
}

function buildPolygonPoints(
    values: number[],  // normalised 0→1
    maxR: number,
    cx: number,
    cy: number,
): string {
    return values
        .map((v, i) => {
            const angle = START_ANGLE + i * ANGLE_STEP;
            const r = v * maxR;
            const { x, y } = polarToXY(angle, r, cx, cy);
            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
}

export default function RadarNutrientChart({ actual, recommended, size = 260 }: Props) {
    const targets: NutrientTotals = { ...RECOMMENDED_DAILY, ...recommended };

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size * 0.28; // reduced from 0.36 so labels fit inside SVG

    // Concentric rings at 25%, 50%, 75%, 100%
    const rings = [0.25, 0.5, 0.75, 1];

    // Normalised actual values (capped at 1.5 to allow slight over-representation)
    const actualNorm = CATEGORIES.map(k =>
        Math.min((actual[k] ?? 0) / (targets[k] ?? RECOMMENDED_DAILY[k]), 1.5),
    );

    // Recommended is always 1.0 per axis (the full polygon)
    const recNorm = CATEGORIES.map(() => 1);

    const actualPoints = buildPolygonPoints(actualNorm, maxR, cx, cy);
    const recPoints = buildPolygonPoints(recNorm, maxR, cx, cy);

    return (
        <View>
            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: 'rgba(190,242,100,0.35)', borderColor: '#bef264' }]} />
                    <Text style={styles.legendText}>Actual intake</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.swatch, { backgroundColor: 'rgba(59,130,246,0.15)', borderColor: '#3b82f6' }]} />
                    <Text style={styles.legendText}>Recommended</Text>
                </View>
            </View>

            <View style={{ alignItems: 'center', overflow: 'hidden' }}>
                <Svg width={size} height={size}>
                    {/* Background concentric rings */}
                    {rings.map(r => {
                        const ringPoints = buildPolygonPoints(
                            CATEGORIES.map(() => r),
                            maxR,
                            cx,
                            cy,
                        );
                        return (
                            <Polygon
                                key={r}
                                points={ringPoints}
                                fill="none"
                                stroke="#374151"
                                strokeWidth={1}
                            />
                        );
                    })}

                    {/* Axis lines */}
                    {CATEGORIES.map((_, i) => {
                        const angle = START_ANGLE + i * ANGLE_STEP;
                        const end = polarToXY(angle, maxR, cx, cy);
                        return (
                            <Line
                                key={i}
                                x1={cx}
                                y1={cy}
                                x2={end.x}
                                y2={end.y}
                                stroke="#374151"
                                strokeWidth={1}
                            />
                        );
                    })}

                    {/* Recommended polygon */}
                    <Polygon
                        points={recPoints}
                        fill="rgba(59,130,246,0.08)"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                    />

                    {/* Actual polygon */}
                    <Polygon
                        points={actualPoints}
                        fill="rgba(190,242,100,0.2)"
                        stroke="#bef264"
                        strokeWidth={2}
                    />

                    {/* Axis labels + RDV values */}
                    {CATEGORIES.map((k, i) => {
                        const angle = START_ANGLE + i * ANGLE_STEP;
                        // Push label beyond maxR but clamp to SVG edge
                        const labelR = Math.min(maxR + 28, size / 2 - 8);
                        const { x, y } = polarToXY(angle, labelR, cx, cy);
                        const meta = NUTRIENT_META[i];
                        const rdv = targets[k];
                        const textAnchor =
                            Math.abs(Math.cos(angle)) < 0.1
                                ? 'middle'
                                : Math.cos(angle) > 0
                                    ? 'start'
                                    : 'end';

                        return (
                            <G key={k}>
                                <SvgText
                                    x={x}
                                    y={y - 6}
                                    fill={meta.color}
                                    fontSize={9}
                                    fontWeight="bold"
                                    textAnchor={textAnchor}
                                >
                                    {LABELS[i]}
                                </SvgText>
                                <SvgText
                                    x={x}
                                    y={y + 6}
                                    fill="#6b7280"
                                    fontSize={8}
                                    textAnchor={textAnchor}
                                >
                                    {rdv}{meta.unit}
                                </SvgText>
                                {/* Dot at actual value on axis */}
                                {(() => {
                                    const v = Math.min(actualNorm[i], 1.5);
                                    const dp = polarToXY(angle, v * maxR, cx, cy);
                                    return (
                                        <Circle
                                            cx={dp.x}
                                            cy={dp.y}
                                            r={3}
                                            fill={meta.color}
                                        />
                                    );
                                })()}
                            </G>
                        );
                    })}
                </Svg>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    legend: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    swatch: {
        width: 12,
        height: 12,
        borderRadius: 3,
        borderWidth: 1.5,
    },
    legendText: {
        fontSize: 11,
        color: '#9ca3af',
    },
});
