import { registerRootComponent } from 'expo';

import './lib/webAlert';   // makes Alert.alert work in a web browser (does nothing on phones)
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);