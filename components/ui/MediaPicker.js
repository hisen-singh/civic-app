import {
  View,
  TouchableOpacity,
  Text,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

export default function MediaPicker({ photo, setPhoto }) {
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera access is needed to take photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0]);
    }
  };

  if (photo) {
    return (
      <View style={styles.photoPreviewWrap}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.photoPreview}
          resizeMode="cover"
        />
        <TouchableOpacity
          onPress={() => setPhoto(null)}
          activeOpacity={0.7}
          style={styles.removePhotoBtn}
          accessibilityRole="button"
          accessibilityLabel="Remove attached photo"
        >
          <MaterialCommunityIcons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={takePhoto}
        style={[styles.photoBtn, { marginRight: 8 }]}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Take a photo with camera"
      >
        <View style={styles.photoBtnIcon}>
          <MaterialCommunityIcons name="camera" size={24} color="#FF4500" />
        </View>
        <Text style={styles.photoBtnTitle}>Camera</Text>
        <Text style={styles.photoBtnSub}>Take a photo</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={pickImage}
        style={styles.photoBtn}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Choose a file from gallery"
      >
        <View style={styles.photoBtnIcon}>
          <MaterialCommunityIcons
            name="image-multiple"
            size={24}
            color="#FF4500"
          />
        </View>
        <Text style={styles.photoBtnTitle}>Gallery</Text>
        <Text style={styles.photoBtnSub}>Choose file</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 20,
  },
  photoPreviewWrap: {
    position: "relative",
    marginBottom: 20,
    borderRadius: 0, // Brutalist sharp
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: 220,
    backgroundColor: "#000000",
  },
  removePhotoBtn: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 48,
    height: 48,
    borderRadius: 0, // Blocky brutalist
    backgroundColor: "#FF4500", // Electric Orange
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  photoBtn: {
    flex: 1,
    backgroundColor: "#000000",
    borderRadius: 0, // Sharp
    borderWidth: 2,
    borderColor: "#FFFFFF",
    paddingVertical: 20,
    alignItems: "center",
  },
  photoBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: 0, // Sharp
    backgroundColor: "#222222",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#444444",
  },
  photoBtnTitle: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  photoBtnSub: {
    color: "#A0AAB5",
    fontSize: 11,
  },
});
