import { Text, View, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native';
import React, { useRef } from 'react';
import { styles } from '../styles/globalStyles';

export const GameScreen = ({
  currentLetter, currentRound, rounds, countdown, gameCategories, answers, setAnswers, handleBasta, handleEndGameEarly, roundTime, myTotalScore, roundData
}: any) => {
  // 1. Inicializamos la referencia para controlar los saltos del teclado
const inputRefs = useRef<any[]>([]);
  const isBastaLocked = roundTime !== null && roundTime > 50;
  const lockedSeconds = roundTime !== null ? roundTime - 50 : 0;

  const confirmCancel = () => {
    Alert.alert(
      'Cancelar Partida',
      '¿Seguro que quieres cancelar la partida para todos?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', onPress: handleEndGameEarly, style: 'destructive' }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60, paddingBottom: 0 }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
{countdown !== null ? (
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingSubtext}>RONDA {currentRound} DE {rounds}</Text>
          <Text style={styles.spinLetter}>{countdown}</Text>
          <Text style={styles.waitingText}>La letra será: ?</Text>
          
          {/* Tabla de posiciones inyectada */}
          <View style={{ marginTop: 40, width: '100%', backgroundColor: '#18181b', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
              POSICIONES ACTUALES
            </Text>
            {roundData && roundData.length > 0 ? (
              roundData.map((player: any, index: number) => (
                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#27272a' }}>
                  <Text style={{ color: '#a1a1aa', fontSize: 16 }}>{player.player_name}</Text>
                  <Text style={{ color: '#10b981', fontSize: 16, fontWeight: 'bold' }}>{player.total_score || 0} pts</Text>
                </View>
              ))
            ) : (
              <Text style={{ color: '#52525b', textAlign: 'center' }}>Cargando puntajes...</Text>
            )}
          </View>
        </View>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
            <View>
              <Text style={[styles.title, { fontSize: 48, marginTop: -5 }]}>{currentLetter}</Text>
            </View>
            
            {/* Panel Superior Derecho con HUD y Cruz */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ alignItems: 'flex-end', backgroundColor: '#18181b', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272a' }}>
                <Text style={styles.inputLabel}>RONDA {currentRound}/{rounds}</Text>
                <Text style={[styles.inputLabel, { color: roundTime !== null && roundTime <= 10 ? '#ef4444' : '#10b981', marginTop: 4 }]}>
                  ⏱ TIEMPO: {roundTime}s
                </Text>
                <Text style={[styles.inputLabel, { color: '#f59e0b', marginTop: 4 }]}>
                  🏆 PUNTOS: {myTotalScore}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.cancelCrossBtn} onPress={confirmCancel}>
                <Text style={styles.cancelCrossText}>✖</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView 
            style={{ flex: 1, width: '100%' }} 
            contentContainerStyle={{ paddingBottom: 120 }} // Deja espacio para que el botón flotante no tape el último input
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.boardContainer}>
              {/* 2. Añadimos el índice (index) al map para rastrear la posición de cada campo */}
              {gameCategories.map((cat: string, index: number) => (
                <View key={cat} style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>{cat.replace('_', ' ').toUpperCase()}</Text>
                  <TextInput 
                    style={styles.gameInput} 
                    value={answers[cat] || ''} 
                    onChangeText={val => setAnswers((prev: any) => ({ ...prev, [cat]: val }))}
                    placeholder={`Escribe un ${cat.replace('_', ' ')}`}
                    placeholderTextColor="#52525b"
                    autoCapitalize="none"
                    // 3. Lógica de salto secuencial del teclado
                    ref={(el) => { inputRefs.current[index] = el; }}
                    returnKeyType={index === gameCategories.length - 1 ? 'done' : 'next'}
                    blurOnSubmit={index === gameCategories.length - 1}
                    onSubmitEditing={() => {
                      if (index < gameCategories.length - 1) {
                        inputRefs.current[index + 1]?.focus();
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Botón Flotante "TUTI FRUTI" en la esquina inferior derecha */}
          <TouchableOpacity 
            style={[styles.fabButton, isBastaLocked && styles.fabButtonDisabled]} 
            onPress={handleBasta}
            disabled={isBastaLocked}
          >
            <Text style={styles.fabText}>
              {isBastaLocked ? `${lockedSeconds}s` : 'TUTI\nFRUTI'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </KeyboardAvoidingView>
  );
};