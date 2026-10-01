import { View } from 'react-native';

import { AppText, Card, Row, Skeleton, Stack } from '../ui';

/** Loading placeholder matching a GoalCard's layout. */
export function GoalCardSkeleton() {
  return (
    <Card className="gap-3">
      <Row gap={12} align="center">
        <Skeleton width={44} height={44} radius={22} />
        <Stack gap={6} className="flex-1">
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={12} />
        </Stack>
        <Skeleton width={60} height={60} radius={30} />
      </Row>
      <Skeleton width="45%" height={20} radius={10} />
    </Card>
  );
}

/** Loading placeholder for the analytics stat row. */
export function StatRowSkeleton({ count = 2 }: { count?: number }) {
  return (
    <Row gap={12}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index} variant="stat" className="flex-1">
          <Stack gap={8}>
            <Skeleton width="70%" height={10} />
            <Skeleton width="50%" height={24} radius={8} />
            <Skeleton width="40%" height={10} />
          </Stack>
        </Card>
      ))}
    </Row>
  );
}

/** Loading placeholder for a chart block. */
export function ChartSkeleton({ height = 140 }: { height?: number }) {
  return (
    <Card>
      <View style={{ height }} className="justify-end">
        <Row gap={6} align="flex-end" style={{ height }}>
          {[0.5, 0.8, 0.35, 0.95, 0.6, 0.75, 0.4].map((ratio, index) => (
            <View key={index} style={{ flex: 1 }}>
              <Skeleton width="100%" height={ratio * height} radius={6} />
            </View>
          ))}
        </Row>
      </View>
      <Skeleton width="30%" height={10} className="mt-3" />
    </Card>
  );
}

/** Loading placeholder for the course progress list. */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <Stack gap={16}>
      {Array.from({ length: count }).map((_, index) => (
        <Stack key={index} gap={8}>
          <Skeleton width="60%" height={14} />
          <Skeleton height={8} radius={4} />
          <Skeleton width="25%" height={10} />
        </Stack>
      ))}
    </Stack>
  );
}

/** Simple centered "no data" slot with a title and optional message. */
export function SectionEmpty({
  title,
  message,
}: {
  title: string;
  message?: string;
}) {
  return (
    <Card>
      <AppText variant="bodySm" weight="medium" align="center">
        {title}
      </AppText>
      {message ? (
        <AppText variant="caption" tone="muted" align="center" className="mt-1">
          {message}
        </AppText>
      ) : null}
    </Card>
  );
}
