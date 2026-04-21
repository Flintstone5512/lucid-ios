import { Pressable, Text, StyleSheet } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  selected?: boolean;
};

export default function OptionButton({ label, onPress, selected }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.button, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.text, selected ? styles.selectedText : styles.unselectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    marginBottom: 14,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  unselected: {
    backgroundColor: "#151820",
    borderColor: "#2A2E36",
  },
  text: {
    fontSize: 16,
    fontWeight: "700",
  },
  selectedText: {
    color: "#0B0B0F",
  },
  unselectedText: {
    color: "#fff",
  },
});