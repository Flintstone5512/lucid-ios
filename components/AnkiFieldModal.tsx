import { ScrollView, Text, Pressable, TextInput, View, Image } from "react-native";

export type MediaRef = { type: "image" | "audio" | "video"; url: string };
export type AnkiFieldSchema = { name: string; value: string; media?: MediaRef[] }[];

function extractImageUrls(value: string): string[] {
  const fromTags = [...value.matchAll(/<img[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
  const fromBare = [...value.matchAll(/https?:\/\/[^\s"<>]+\.(?:png|jpg|jpeg|gif|webp)(\?[^\s"<>]*)?/gi)].map((m) => m[0]);
  return [...new Set([...fromTags, ...fromBare])].filter((u) => /^https?:\/\//i.test(u));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function FieldPreview({
  value,
  media = [],
  maxLines = 2,
}: {
  value: string;
  media?: MediaRef[];
  maxLines?: number;
}) {
  const imgUrlsFromText = extractImageUrls(value);
  const imgUrlsFromMedia = media.filter((m) => m.type === "image").map((m) => m.url);
  const allImgUrls = [...new Set([...imgUrlsFromText, ...imgUrlsFromMedia])];
  const text = stripHtml(value);
  return (
    <View style={{ marginTop: 2 }}>
      {!!text && (
        <Text style={{ color: "#A9BDDB", fontSize: 12 }} numberOfLines={maxLines}>
          {text}
        </Text>
      )}
      {allImgUrls.map((uri, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={{ width: "100%", height: 80, borderRadius: 6, marginTop: 4 }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

export function AnkiFieldModal({
  title, subtitle, fields, sample,
  frontIndices, backIndices, audioIndex,
  onFrontToggle, onBackToggle, onAudioToggle,
  deckName, onDeckNameChange,
  onConfirm, confirmLabel, onCancel,
  showAudio = true,
}: {
  title: string; subtitle: string;
  fields: string[];
  sample: AnkiFieldSchema;
  frontIndices: number[]; backIndices: number[]; audioIndex: number | null;
  onFrontToggle: (i: number) => void;
  onBackToggle:  (i: number) => void;
  onAudioToggle: (i: number) => void;
  deckName?: string; onDeckNameChange?: (name: string) => void;
  onConfirm: () => void; confirmLabel: string; onCancel: () => void;
  showAudio?: boolean;
}) {
  const frontPreviewFields = frontIndices.map((i) => sample[i]).filter(Boolean);
  const backPreviewFields  = backIndices.map((i) => sample[i]).filter(Boolean);
  const frontPreviewText = frontPreviewFields.map((f) => stripHtml(f.value)).filter(Boolean).join(" · ");
  const backPreviewText  = backPreviewFields.map((f) => stripHtml(f.value)).filter(Boolean).join("\n");
  const frontPreviewImgs = [
    ...frontPreviewFields.flatMap((f) => extractImageUrls(f.value)),
    ...frontPreviewFields.flatMap((f) => (f.media ?? []).filter((m) => m.type === "image").map((m) => m.url)),
  ];
  const backPreviewImgs = [
    ...backPreviewFields.flatMap((f) => extractImageUrls(f.value)),
    ...backPreviewFields.flatMap((f) => (f.media ?? []).filter((m) => m.type === "image").map((m) => m.url)),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: "#0e1424" }}>
      <View style={{ padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: "rgba(169,189,219,0.1)" }}>
        <Text style={{ color: "white", fontSize: 20, fontWeight: "800" }}>{title}</Text>
        {!!subtitle && <Text style={{ color: "#A9BDDB", marginTop: 4, fontSize: 13 }}>{subtitle}</Text>}
      </View>

      <ScrollView style={{ flex: 1, padding: 20 }}>
        {onDeckNameChange !== undefined && (
          <TextInput
            value={deckName}
            onChangeText={onDeckNameChange}
            placeholder="Deck name (optional)"
            placeholderTextColor="#777"
            style={{
              borderWidth: 1,
              borderColor: "#2a2e36",
              backgroundColor: "#0f172a",
              color: "white",
              padding: 12,
              borderRadius: 12,
              marginBottom: 16,
            }}
          />
        )}

        <Text style={{ color: "#A9BDDB", fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
          Select one or more fields per side. Multiple fields are joined together on the card.
        </Text>

        {/* FRONT — multi-select */}
        <Text style={{ color: "#D86732", fontWeight: "700", marginBottom: 8 }}>Front of Card</Text>
        {fields.map((name, i) => {
          const selected = frontIndices.includes(i);
          return (
            <Pressable key={`f${i}`} onPress={() => onFrontToggle(i)} style={{
              flexDirection: "row", alignItems: "flex-start",
              backgroundColor: selected ? "rgba(216,103,50,0.15)" : "#161b22",
              borderWidth: 1, borderColor: selected ? "#D86732" : "#2a2e36",
              borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 3, borderWidth: 2,
                borderColor: selected ? "#D86732" : "#555",
                backgroundColor: selected ? "#D86732" : "transparent",
                marginRight: 10, marginTop: 1, alignItems: "center", justifyContent: "center",
              }}>
                {selected && <Text style={{ color: "#111", fontSize: 11, fontWeight: "900" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: selected ? "#D86732" : "white", fontWeight: "700", fontSize: 13 }}>{name}</Text>
                {sample[i]?.value || sample[i]?.media?.length ? <FieldPreview value={sample[i]?.value ?? ""} media={sample[i]?.media} maxLines={2} /> : null}
              </View>
            </Pressable>
          );
        })}

        {/* BACK — multi-select */}
        <Text style={{ color: "#6EADEB", fontWeight: "700", marginTop: 16, marginBottom: 8 }}>Back of Card</Text>
        {fields.map((name, i) => {
          const selected = backIndices.includes(i);
          return (
            <Pressable key={`b${i}`} onPress={() => onBackToggle(i)} style={{
              flexDirection: "row", alignItems: "flex-start",
              backgroundColor: selected ? "rgba(110,173,235,0.15)" : "#161b22",
              borderWidth: 1, borderColor: selected ? "#6EADEB" : "#2a2e36",
              borderRadius: 10, padding: 12, marginBottom: 8,
            }}>
              <View style={{
                width: 18, height: 18, borderRadius: 3, borderWidth: 2,
                borderColor: selected ? "#6EADEB" : "#555",
                backgroundColor: selected ? "#6EADEB" : "transparent",
                marginRight: 10, marginTop: 1, alignItems: "center", justifyContent: "center",
              }}>
                {selected && <Text style={{ color: "#111", fontSize: 11, fontWeight: "900" }}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: selected ? "#6EADEB" : "white", fontWeight: "700", fontSize: 13 }}>{name}</Text>
                {sample[i]?.value || sample[i]?.media?.length ? <FieldPreview value={sample[i]?.value ?? ""} media={sample[i]?.media} maxLines={2} /> : null}
              </View>
            </Pressable>
          );
        })}

        {/* AUDIO — optional single pick, Anki only */}
        {showAudio && (
          <>
            <Text style={{ color: "#A9BDDB", fontWeight: "700", marginTop: 16, marginBottom: 4 }}>
              Audio Field <Text style={{ fontWeight: "400", fontSize: 12 }}>(optional)</Text>
            </Text>
            <Text style={{ color: "#555", fontSize: 12, marginBottom: 8 }}>
              Pick the field containing [sound:…] tags. Plays on the front of each card.
            </Text>
            {fields.map((name, i) => {
              const selected = audioIndex === i;
              return (
                <Pressable key={`a${i}`} onPress={() => onAudioToggle(i)} style={{
                  flexDirection: "row", alignItems: "center",
                  backgroundColor: selected ? "rgba(80,200,120,0.12)" : "#161b22",
                  borderWidth: 1, borderColor: selected ? "#50c878" : "#2a2e36",
                  borderRadius: 10, padding: 12, marginBottom: 6,
                }}>
                  <View style={{
                    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
                    borderColor: selected ? "#50c878" : "#555",
                    backgroundColor: selected ? "#50c878" : "transparent",
                    marginRight: 10,
                  }} />
                  <Text style={{ color: selected ? "#50c878" : "#A9BDDB", fontWeight: selected ? "700" : "400", fontSize: 13 }}>{name}</Text>
                </Pressable>
              );
            })}
          </>
        )}

        {/* Live preview */}
        {sample.length > 0 && (frontIndices.length > 0 || backIndices.length > 0) && (
          <View style={{ marginTop: 24, backgroundColor: "#161b22", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#2a2e36" }}>
            <Text style={{ color: "#D86732", fontWeight: "700", fontSize: 11, marginBottom: 10, letterSpacing: 1 }}>PREVIEW</Text>
            <Text style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>FRONT</Text>
            {frontPreviewText ? (
              <Text style={{ color: "white", fontSize: 14, marginBottom: 4 }} numberOfLines={4}>{frontPreviewText}</Text>
            ) : null}
            {frontPreviewImgs.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: "100%", height: 120, borderRadius: 8, marginBottom: 4 }} resizeMode="contain" />
            ))}
            {!frontPreviewText && frontPreviewImgs.length === 0 && (
              <Text style={{ color: "white", fontSize: 14, marginBottom: 4 }}>—</Text>
            )}
            <View style={{ height: 1, backgroundColor: "#2a2e36", marginTop: 8, marginBottom: 12 }} />
            <Text style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>BACK</Text>
            {backPreviewText ? (
              <Text style={{ color: "white", fontSize: 14, marginBottom: 4 }} numberOfLines={6}>{backPreviewText}</Text>
            ) : null}
            {backPreviewImgs.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: "100%", height: 120, borderRadius: 8, marginBottom: 4 }} resizeMode="contain" />
            ))}
            {!backPreviewText && backPreviewImgs.length === 0 && (
              <Text style={{ color: "white", fontSize: 14 }}>—</Text>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={{ padding: 20, gap: 10 }}>
        <Pressable
          onPress={onConfirm}
          disabled={frontIndices.length === 0 || backIndices.length === 0}
          style={{
            backgroundColor: frontIndices.length > 0 && backIndices.length > 0 ? "#D86732" : "#2a2e36",
            padding: 16, borderRadius: 14, alignItems: "center",
          }}
        >
          <Text style={{ color: frontIndices.length > 0 && backIndices.length > 0 ? "#111" : "#555", fontWeight: "800", fontSize: 16 }}>
            {confirmLabel}
          </Text>
        </Pressable>
        <Pressable onPress={onCancel} style={{ padding: 14, alignItems: "center" }}>
          <Text style={{ color: "#A9BDDB", fontWeight: "600" }}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
