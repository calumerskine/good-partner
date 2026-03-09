import { Control, Controller } from "react-hook-form";
import Input from "./ui/input";

export default function DateInput({
  control,
  placeholder,
  name,
}: {
  control: Control<any>;
  placeholder: string;
  name: string;
}) {
  return (
    <Controller
      control={control}
      rules={{
        required: true,
      }}
      render={({ field: { onChange, value } }) => (
        <Input
          placeholder={placeholder}
          onChangeText={onChange}
          value={value}
          name={name}
          style={{ width: "auto", flexGrow: 1 }}
        />
      )}
      name={name}
    />
  );
}
