// Alert.alert does nothing in a web browser (React Native Web ships it empty), so on
// the web, errors would be silent and "Delete?" / "Sign out?" buttons would never fire.
// This swaps in the browser's own pop-ups. On phones (Expo Go / the built app) it does
// nothing at all, so the normal native alerts keep working.
import { Alert, Platform } from 'react-native';

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = Array.isArray(buttons) ? buttons : [];
    const cancel = list.find((b) => b && b.style === 'cancel');
    const actions = list.filter((b) => b && b !== cancel);

    // 1) Message only, or a single button such as "OK": show it, then run that button.
    if (list.length <= 1) {
      window.alert(text);
      if (list[0] && typeof list[0].onPress === 'function') list[0].onPress();
      return;
    }

    // 2) Cancel plus one action ("Delete?", "Sign out?"): OK runs the action, Cancel runs cancel.
    if (cancel && actions.length === 1) {
      if (window.confirm(text)) {
        if (typeof actions[0].onPress === 'function') actions[0].onPress();
      } else if (typeof cancel.onPress === 'function') {
        cancel.onPress();
      }
      return;
    }

    // 3) A menu (for example Open / Delete / Cancel): type the number of the choice.
    const menu = actions.map((b, i) => `${i + 1}. ${b.text}`).join('\n');
    const answer = window.prompt(`${text}\n\n${menu}\n\nType a number (or Cancel to close):`);
    if (answer === null) {
      if (cancel && typeof cancel.onPress === 'function') cancel.onPress();
      return;
    }
    const picked = actions[parseInt(answer, 10) - 1];
    if (picked && typeof picked.onPress === 'function') picked.onPress();
  };
}