import { forwardRef } from "react";
import { Switch as RNSwitch, SwitchProps } from "react-native";

type Props = SwitchProps & {
  value: boolean;
  onChange: (value: boolean) => void;
};
export default forwardRef(function Switch(
  { value, onChange, ...props }: Props,
  ref: React.Ref<RNSwitch>
) {
  return (
    <RNSwitch {...props} value={value} onValueChange={onChange} ref={ref} />
  );
});
