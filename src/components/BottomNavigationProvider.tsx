import { BottomNavigation } from "./BottomNavigation";
import { useAuth } from "@/hooks/useAuth";

export const BottomNavigationProvider = () => {
  const { user } = useAuth();

  return <BottomNavigation user={user} />;
};
