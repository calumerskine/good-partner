import { forwardRef, useCallback } from "react";
import { Switch as RNSwitch, SwitchProps } from "react-native";
import { useHaptics, type HapticPreset } from "@/hooks/use-haptics";

type Props = Omit<SwitchProps, "onValueChange" | "onChange"> & {
  value: boolean;
  onValueChange: (value: boolean) => void;
  hapticPreset?: "selection" | "impactLight";
};
export default forwardRef(function Switch(
  { value, onValueChange, hapticPreset = "selection", ...props }: Props,
  ref: React.Ref<RNSwitch>
) {
  const { trigger } = useHaptics();

  const handleValueChange = useCallback(
    (next: boolean) => {
      trigger(hapticPreset as HapticPreset);
      onValueChange(next);
    },
    [trigger, hapticPreset, onValueChange],
  );

  return (
    <RNSwitch {...props} value={value} onValueChange={handleValueChange} ref={ref} />
  );
});
