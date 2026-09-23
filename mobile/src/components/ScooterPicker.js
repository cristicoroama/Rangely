import { View } from "react-native";

import { Choice } from "./Choice";
import { DISPLAYS, OTHER, SCOOTERS } from "../scooters";

/** The presets, each with its pack size beside it, and a way out for
 *  everything else. Choosing one fills in the battery size, which is the one
 *  number nobody knows off the top of their head. */
export function ScooterList({ value, onPick }) {
  return (
    <View style={{ gap: 8 }}>
      {[...SCOOTERS, OTHER].map((m) => (
        <Choice
          key={m.key}
          title={m.name}
          right={m.key === OTHER.key ? null : `${m.packWh} Wh`}
          subtitle={m.key === OTHER.key ? "Type its battery size yourself" : null}
          selected={value === m.key}
          onPress={() => onPick(m)}
        />
      ))}
    </View>
  );
}

const DISPLAY_TEXT = {
  app: { title: "Exact percent, in its phone app", subtitle: "Most precise", icon: "battery" },
  number: { title: "A number on the handlebar", subtitle: "Precise enough", icon: "bolt" },
  bars: { title: "Bars on the handlebar", subtitle: "Works for longer rides", icon: "list" },
};

export function DisplayList({ value, onPick }) {
  return (
    <View style={{ gap: 8 }}>
      {DISPLAYS.map((d) => {
        const x = DISPLAY_TEXT[d.key] ?? { title: d.label };
        return (
          <Choice
            key={d.key}
            icon={x.icon}
            title={x.title}
            subtitle={x.subtitle}
            selected={value === d.key}
            onPress={() => onPick(d.key)}
          />
        );
      })}
    </View>
  );
}
