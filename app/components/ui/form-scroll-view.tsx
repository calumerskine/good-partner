import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  TextInput,
  ViewStyle,
} from "react-native";

type FormScrollContextType = {
  scrollViewRef: React.RefObject<ScrollView | null>;
  setFocusedInput: (input: TextInput | null) => void;
};

const FormScrollContext = createContext<FormScrollContextType | null>(null);

export function useFormScrollContext() {
  return useContext(FormScrollContext);
}

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
} & Omit<ScrollViewProps, "ref">;

export function FormScrollView({ children, style, ...scrollProps }: Props) {
  const scrollViewRef = useRef<ScrollView | null>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const isKeyboardVisible = useRef(false);

  const scrollToFocused = useCallback(() => {
    const input = focusedInputRef.current;
    const scrollView = scrollViewRef.current;
    if (!input || !scrollView) return;

    input.measureLayout(
      scrollView as unknown as React.ElementRef<typeof ScrollView>,
      (_x, y) => {
        scrollView.scrollTo({ y: Math.max(0, y - 120), animated: true });
      },
      () => {},
    );
  }, []);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, () => {
      isKeyboardVisible.current = true;
      scrollToFocused();
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      isKeyboardVisible.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToFocused]);

  const setFocusedInput = useCallback(
    (input: TextInput | null) => {
      focusedInputRef.current = input;
      if (isKeyboardVisible.current) {
        scrollToFocused();
      }
    },
    [scrollToFocused],
  );

  return (
    <FormScrollContext.Provider value={{ scrollViewRef, setFocusedInput }}>
      <KeyboardAvoidingView
        style={[{ flex: 1 }, style]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </FormScrollContext.Provider>
  );
}
