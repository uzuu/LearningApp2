import { useState } from "react";
import { Button, StyleSheet, Text, TextInput, View } from "react-native";

const INTERVALS = "1, 2, 4, 8, 16, 32, 64, 128";

export default function NewLearning({ navigation, onAddLearningItem }) {
  const [title, setTitle] = useState("");

  const handleAdd = () => {
    const added = onAddLearningItem(title);
    if (!added) {
      return;
    }

    setTitle("");
    navigation.navigate("Schedule");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>New Learning</Text>
      <Text style={styles.caption}>Ebbinghaus review days: {INTERVALS}</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter what you learned"
        style={styles.input}
      />

      <Button title="Save And Schedule Reviews" onPress={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  caption: {
    textAlign: "center",
    color: "#555",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
});
