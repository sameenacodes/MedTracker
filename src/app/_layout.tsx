import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#F6F8F7',
        },
        animation: 'slide_from_right',
      }}
    />
  );
}