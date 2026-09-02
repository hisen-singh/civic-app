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
import { theme } from "../../theme";

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
          <MaterialCommunityIcons name="close" size={20} color="#FFF" />
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
          <MaterialCommunityIcons name="camera" size={24} color="#3B82F6" />
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
            color="#3B82F6"
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
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: 220,
    backgroundColor: theme.colors.surfaceElevated,
  },
  removePhotoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
  },
  photoBtn: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: 20,
    alignItems: "center",
    ...theme.shadows.soft,
  },
  photoBtnIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  photoBtnTitle: {
    color: theme.colors.textPrimary,
    fontWeight: "800",
    fontSize: 14,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  photoBtnSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
});
