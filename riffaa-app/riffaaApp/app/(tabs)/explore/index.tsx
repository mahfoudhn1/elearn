import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, TouchableWithoutFeedback, View } from 'react-native';

import { TeachersList } from '../../../components/teachers/TeachersList';
import {
  AppText,
  Card,
  Chip,
  IconButton,
  Row,
  ScreenHeader,
  Stack,
} from '../../../components/ui';
import { GRADE_API_MAP, GRADES, WILAYAS } from '../../../constants/teachers';
import { useRowDirection } from '../../../hooks/useDirection';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import { describeApiError } from '../../../services/api/client';
import { getTeachers } from '../../../services/api/teachers';
import type { TeacherProfile } from '../../../types';

const ALL = 'الكل';

function SelectorModal({
  visible,
  onClose,
  options,
  currentSelection,
  onSelect,
  title,
}: {
  visible: boolean;
  onClose: () => void;
  options: string[];
  currentSelection: string;
  onSelect: (value: string) => void;
  title: string;
}) {
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        >
          <TouchableWithoutFeedback>
            <Card variant="raised" className="w-full">
              <Row justify="space-between" align="center" className="mb-3">
                <AppText variant="title">{title}</AppText>
                <IconButton
                  icon="close"
                  accessibilityLabel={t('close')}
                  variant="ghost"
                  onPress={onClose}
                />
              </Row>
              <Stack gap={8}>
                {options.map((option) => {
                  const selected = currentSelection === option;
                  return (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option}
                      onPress={() => {
                        onSelect(option);
                        onClose();
                      }}
                      className={`min-h-[48px] items-center justify-between rounded-card px-4 ${
                        selected ? 'bg-brand/15 border border-brand/30' : 'bg-surface-2'
                      }`}
                      style={({ pressed }) => [rowDirection, { opacity: pressed ? 0.85 : 1 }]}
                    >
                      <AppText
                        variant="bodySm"
                        weight={selected ? 'medium' : 'regular'}
                        tone={selected ? 'brand' : 'ink'}
                      >
                        {option}
                      </AppText>
                      {selected ? (
                        <Ionicons name="checkmark" size={18} color={tokens.brand} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </Stack>
            </Card>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

export default function ExploreTeachersScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const rowDirection = useRowDirection();
  const { t } = useTranslation();

  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedGrade, setSelectedGrade] = useState(ALL);
  const [selectedWilaya, setSelectedWilaya] = useState(ALL);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [wilayaModalVisible, setWilayaModalVisible] = useState(false);

  const fetchTeachersList = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const apiGradeLevel = GRADE_API_MAP[selectedGrade];
        const data = await getTeachers<TeacherProfile[]>({
          ...(apiGradeLevel ? { teaching_level: apiGradeLevel } : {}),
          ...(selectedWilaya !== ALL ? { wilaya: selectedWilaya } : {}),
        });
        setTeachers(Array.isArray(data) ? data : []);
      } catch (caught) {
        setError(describeApiError(caught));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedGrade, selectedWilaya],
  );

  useEffect(() => {
    void fetchTeachersList();
  }, [fetchTeachersList]);

  const filterPill = (
    label: string,
    value: string,
    onPress: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      className="h-11 flex-1 items-center justify-between rounded-pill border border-hairline bg-surface-2 px-4"
      style={({ pressed }) => [rowDirection, { opacity: pressed ? 0.85 : 1 }]}
    >
      <AppText variant="bodySm" weight="medium" numberOfLines={1}>
        {value}
      </AppText>
      <Row gap={6} align="center">
        <AppText variant="micro" tone="subtle">
          {label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={tokens.inkSubtle} />
      </Row>
    </Pressable>
  );

  return (
    <View className="flex-1">
      <ScreenHeader title={t('discoverTeachers')} />

      <Stack gap={12} className="px-4 pb-3 pt-2">
        <Row gap={12}>
          {filterPill(t('wilaya'), selectedWilaya, () => setWilayaModalVisible(true))}
          {filterPill(t('gradeLevel'), selectedGrade, () => setGradeModalVisible(true))}
        </Row>

        {(selectedGrade !== ALL || selectedWilaya !== ALL) && (
          <Row gap={8} wrap>
            {selectedGrade !== ALL ? (
              <Chip label={selectedGrade} icon="close" onPress={() => setSelectedGrade(ALL)} />
            ) : null}
            {selectedWilaya !== ALL ? (
              <Chip label={selectedWilaya} icon="close" onPress={() => setSelectedWilaya(ALL)} />
            ) : null}
          </Row>
        )}
      </Stack>

      <TeachersList
        teachers={teachers}
        loading={loading}
        refreshing={refreshing}
        error={error}
        onRefresh={() => void fetchTeachersList(true)}
        onSelect={(teacher) => router.push(`/explore/${teacher.id}`)}
      />

      <SelectorModal
        visible={gradeModalVisible}
        onClose={() => setGradeModalVisible(false)}
        options={GRADES}
        currentSelection={selectedGrade}
        onSelect={setSelectedGrade}
        title={t('gradeLevel')}
      />
      <SelectorModal
        visible={wilayaModalVisible}
        onClose={() => setWilayaModalVisible(false)}
        options={WILAYAS}
        currentSelection={selectedWilaya}
        onSelect={setSelectedWilaya}
        title={t('wilaya')}
      />
    </View>
  );
}
