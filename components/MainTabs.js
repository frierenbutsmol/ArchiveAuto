import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import AIChat from "./AIChat";
import GarageScreen from "./GarageScreen";
import HomeScreen from "./HomeScreen";
import Notification from "./Notification";
import ProfileScreen from "./ProfileScreen";

const Tab = createBottomTabNavigator();

const ICON_NAMES = {
  Garage: { active: "car", inactive: "car-outline" },
  Home: { active: "home", inactive: "home-outline" },
  Chat: { active: "sparkles", inactive: "sparkles-outline" },
  Alerts: { active: "notifications", inactive: "notifications-outline" },
  Profile: { active: "person", inactive: "person-outline" },
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#111",
          borderTopColor: "#222",
          height: 70,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "turquoise",
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ color, focused }) => (
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: focused
                ? "rgba(55, 194, 223, 0.37)"
                : "transparent",
            }}
          >
            <Ionicons
              name={
                focused
                  ? ICON_NAMES[route.name].active
                  : ICON_NAMES[route.name].inactive
              }
              size={24}
              color={color}
            />
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Garage" component={GarageScreen} />
      <Tab.Screen name="Chat" component={AIChat} />
      <Tab.Screen name="Alerts" component={Notification} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
