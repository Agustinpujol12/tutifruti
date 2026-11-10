import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import React, { useEffect, useState } from 'react';
import { styles } from '../styles/globalStyles';
import { supabase } from '../../lib/supabase';

export const ValidationScreen = ({
  currentLetter, currentRound, rounds, roundData, gameCategories, handleNextRound, 
  isProcessingNext, handleEndGameEarly, isHost, currentId, name, refreshData
}: any) => {
  const [disputes, setDisputes] = useState<any[]>([]);

  useEffect(() => {
    const fetchDisputes = async () => {
      const { data } = await supabase.from('round_disputes').select('*').eq('game_id', currentId).eq('resolved', false);
      if (data) setDisputes(data);
    };
    fetchDisputes();

    const channel = supabase.channel('disputes_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'round_disputes', filter: `game_id=eq.${currentId}` }, 
      () => {
        fetchDisputes();
        refreshData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentId]);

  const handleVote = async (category: string, word: string, voteYes: boolean) => {
    await supabase.rpc('vote_disputed_word', {
      p_game_id: currentId,
      p_category: category,
      p_word: word,
      p_player_name: name,
      p_vote_yes: voteYes,
      p_total_players: roundData.length
    });
  };

  const sortedRoundData = [...roundData].sort((a, b) => {
    if (a.player_name === name) return -1;
    if (b.player_name === name) return 1;
    return a.player_name.localeCompare(b.player_name);
  });

  return (
    <View style={[styles.container, { justifyContent: 'flex-start', paddingTop: 60 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 }}>
        <Text style={[styles.title, { fontSize: 32, marginBottom: 0 }]}>
          RESULTADOS <Text style={{ color: '#6366f1' }}>"{currentLetter}"</Text>
        </Text>
        <TouchableOpacity style={styles.cancelCrossBtn} onPress={handleEndGameEarly}>
          <Text style={styles.cancelCrossText}>✖</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={{ flex: 1, width: '100%' }} showsVerticalScrollIndicator={false}>
        {sortedRoundData.map((playerRound: any) => {
          const roundTotal = gameCategories.reduce((sum: number, cat: string) => sum + (playerRound.scores?.[cat] || 0), 0);
          const isMe = playerRound.player_name === name;

          return (
            <View 
              key={playerRound.player_name} 
              style={{ 
                backgroundColor: isMe ? '#1e1e28' : '#18181b', 
                padding: 15, 
                borderRadius: 12, 
                marginBottom: 20, 
                borderWidth: isMe ? 2 : 1, 
                borderColor: isMe ? '#6366f1' : '#27272a' 
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#3f3f46', paddingBottom: 10, marginBottom: 10 }}>
                <Text style={{ color: isMe ? '#6366f1' : '#fff', fontWeight: 'bold', fontSize: 18 }}>
                  {playerRound.player_name} {isMe && '(TÚ)'}
                </Text>
                <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 18 }}>+{roundTotal} pts</Text>
              </View>

              {gameCategories.map((cat: string) => {
                const ansText = playerRound.answers?.[cat] || '';
                const itemScore = playerRound.scores?.[cat] || 0;
                const isInvalid = itemScore === 0;
                
                const dispute = disputes.find(d => d.category === cat && d.word === ansText.trim().toLowerCase());
                const iVoted = dispute && (dispute.voters_yes.includes(name) || dispute.voters_no.includes(name));

                return (
                  <View key={cat} style={{ marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#27272a', paddingBottom: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.inputLabel, { fontSize: 10 }]}>{cat.replace('_', ' ').toUpperCase()}</Text>
                      <Text style={{ fontSize: 10, color: itemScore === 20 ? '#10b981' : itemScore === 10 ? '#f59e0b' : itemScore === 5 ? '#3b82f6' : '#ef4444' }}>
                        {itemScore > 0 ? `+${itemScore}` : '0'}
                      </Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ color: isInvalid && !dispute ? '#ef4444' : '#fff', fontWeight: 'bold', textDecorationLine: isInvalid && !dispute ? 'line-through' : 'none', flex: 1 }}>
                        {ansText || '---'}
                      </Text>

                      {isInvalid && ansText !== '' && dispute && (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {isMe ? (
                            <Text style={{ color: '#f59e0b', fontSize: 12, fontStyle: 'italic' }}>En revisión...</Text>
                          ) : iVoted ? (
                            <Text style={{ color: '#6b7280', fontSize: 12 }}>Voto registrado</Text>
                          ) : (
                            <>
                              <TouchableOpacity onPress={() => handleVote(cat, ansText.trim().toLowerCase(), true)} style={{ backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Sí</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => handleVote(cat, ansText.trim().toLowerCase(), false)} style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 }}>
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>No</Text>
                              </TouchableOpacity>
                            </>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {isHost ? (
        <TouchableOpacity style={[styles.primaryButton, { marginTop: 15, opacity: isProcessingNext ? 0.7 : 1 }]} onPress={handleNextRound} disabled={isProcessingNext}>
          {isProcessingNext ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{currentRound < rounds ? 'Siguiente Ronda' : 'Ver Ganador'}</Text>}
        </TouchableOpacity>
      ) : (
        <View style={{ marginTop: 15, padding: 16, alignItems: 'center' }}>
          <Text style={styles.waitingText}>Esperando que el creador continúe...</Text>
        </View>
      )}
    </View>
  );
};