
window.PBPromptGenerator = {
  clean(value) {
    return value && value !== "Select an option" && value !== "No value" ? value : "";
  },

  structured(project) {
    const s = project.selections || {};
    const lines = [];
    const add = (label, value) => {
      value = this.clean(value);
      if (value) lines.push(`${label}: ${value}`);
    };

    add("PROJECT", project.projectName);
    add("PLATFORM", project.platform);
    add("THEME", s.theme);
    add("TYPE", s.type);
    add("SCENE", s.scene);
    add("DURATION", s.duration);
    add("ASPECT RATIO", s.aspectRatio);
    add("ACTION PACE", s.actionPace);
    add("CAMERA PACE", s.cameraPace);
    add("LOCATION", s.location);
    add("TIME OF DAY", s.timeOfDay);
    add("WEATHER", s.weather);
    add("SURROUNDINGS", s.surroundings);
    add("CHARACTER / SUBJECT", s.character);
    add("ACTION", s.action);
    add("CAMERA MOVEMENT", s.cameraMovement);
    add("LIGHTING", s.lighting);
    add("SPOKEN DIALOGUE - ENGLISH", s.dialogueEnglish);
    add("DIALOGUE LANGUAGE", s.dialogueLanguage);
    add("ROMANIZED DIALOGUE", s.dialogueRomanized);

    if (s.musicEnabled === "Yes") {
      add("BACKGROUND MUSIC", "Enabled");
      add("MUSIC GENRE", s.musicGenre);
      add("MUSIC STYLE", s.musicStyle);
      add("TEMPO", s.tempo);
    } else add("BACKGROUND MUSIC", s.musicEnabled);

    add("VOICE VOLUME", s.voiceVolume ? s.voiceVolume + "%" : "");
    add("MUSIC VOLUME", s.musicVolume ? s.musicVolume + "%" : "");
    add("SOUND EFFECTS VOLUME", s.sfxVolume ? s.sfxVolume + "%" : "");
    add("AUDIO PRIORITY", s.audioPriority);
    add("AUDIO DUCKING", s.audioDucking);
    add("DIALOGUE / VOICE NOTES", s.dialogueNotes);
    add("NEGATIVE / RESTRICTIONS", s.negativePrompt);
    add("ADDITIONAL NOTES", s.notes);
    return lines.join("\n\n");
  },

  final(project) {
    const s = project.selections || {};
    const clean = v => this.clean(v);
    const p = [];

    const theme = clean(s.theme) || "cinematic";
    const type = clean(s.type);
    const scene = clean(s.scene);
    const duration = clean(s.duration) || "10 seconds";
    const ratio = clean(s.aspectRatio) || "16:9";

    p.push(
`Create a polished, visually coherent ${theme} AI video${type ? ` focused on ${type}` : ""}${scene ? `, specifically a ${scene} sequence` : ""}. 
The finished shot should feel intentionally directed rather than randomly generated. Maintain continuity from the first frame to the last frame. 
Duration: ${duration}. Aspect ratio: ${ratio}.`
    );

    if (clean(s.character)) {
      p.push(
`SUBJECT / CHARACTER:
${clean(s.character)}
Keep the subject visually consistent throughout the entire shot. Preserve identity, age, facial structure, skin tone, hairstyle, body proportions, clothing, accessories, and recognizable details unless the prompt explicitly says otherwise.`
      );
    }

    const env = [];
    if (clean(s.location)) env.push(`Location: ${clean(s.location)}.`);
    if (clean(s.timeOfDay)) env.push(`Time of day: ${clean(s.timeOfDay)}.`);
    if (clean(s.weather)) env.push(`Weather: ${clean(s.weather)}.`);
    if (clean(s.surroundings)) env.push(`Surroundings and environmental details: ${clean(s.surroundings)}.`);
    if (env.length) {
      p.push(
`ENVIRONMENT:
${env.join(" ")}
Keep the environment spatially consistent. Do not randomly replace buildings, furniture, props, terrain, or background elements during the shot.`
      );
    }

    if (clean(s.action)) {
      const actionPace = clean(s.actionPace) || "Medium";
      p.push(
`ACTION & PERFORMANCE:
${clean(s.action)}
Action pace: ${actionPace}. Make the motion readable and physically believable. Use natural acceleration and deceleration appropriate to the selected pace. 
Do not skip important movement through teleportation, sudden unexplained pose changes, or discontinuous body motion.`
      );
    } else if (clean(s.actionPace)) {
      p.push(`ACTION PACE:\n${clean(s.actionPace)}. Keep movement physically believable and temporally consistent.`);
    }

    const visual = [];
    if (clean(s.cameraMovement)) visual.push(`Camera movement: ${clean(s.cameraMovement)}.`);
    if (clean(s.cameraPace)) visual.push(`Camera pace: ${clean(s.cameraPace)}.`);
    if (clean(s.lighting)) visual.push(`Lighting: ${clean(s.lighting)}.`);
    if (visual.length) {
      p.push(
`CAMERA, PACING & LIGHTING:
${visual.join(" ")}
Keep camera motion smooth and intentional. Match camera speed to the action rather than allowing sudden unmotivated jumps. Maintain stable composition and consistent subject scale unless a deliberate push-in, pull-back, orbit, or tracking move is specified.`
      );
    }

    if (clean(s.dialogueEnglish)) {
      let dialogue = `Original English dialogue: "${clean(s.dialogueEnglish)}".`;
      if (clean(s.dialogueLanguage) && clean(s.dialogueLanguage) !== "English") {
        dialogue += ` Spoken language target: ${clean(s.dialogueLanguage)}.`;
        if (clean(s.dialogueRomanized)) {
          dialogue += ` EXACT SPOKEN LINE — DO NOT TRANSLATE, SHORTEN, SUBSTITUTE, OR PARAPHRASE: "${clean(s.dialogueRomanized)}". The English line is meaning/context only.`;
        } else {
          dialogue += ` No exact target-language line has been supplied. Do not invent a short substitute. Translate the entire English sentence faithfully into the selected language before video generation, then place the complete Latin-letter / romanized translation in the exact-dialogue field.`;
        }
      }
      p.push(
`DIALOGUE:
${dialogue}
Synchronize mouth movement naturally with the COMPLETE exact spoken line. Do not replace the line with a single keyword, fragment, chant, or approximate sound. Keep the character's emotion and delivery consistent with the scene.`
      );
    }

    const audio = [];
    if (s.musicEnabled === "Yes") {
      audio.push(`Background music is enabled.`);
      if (clean(s.musicGenre)) audio.push(`Genre: ${clean(s.musicGenre)}.`);
      if (clean(s.musicStyle)) audio.push(`Style: ${clean(s.musicStyle)}.`);
      if (clean(s.tempo)) audio.push(`Tempo: ${clean(s.tempo)}.`);
    } else if (s.musicEnabled === "No") {
      audio.push(`No background music.`);
    }
    if (s.voiceVolume) audio.push(`Voice volume: ${s.voiceVolume}%.`);
    if (s.musicVolume) audio.push(`Music volume: ${s.musicVolume}%.`);
    if (s.sfxVolume) audio.push(`Sound effects volume: ${s.sfxVolume}%.`);
    if (clean(s.audioPriority)) audio.push(`Audio priority: ${clean(s.audioPriority)}.`);
    if (clean(s.audioDucking)) audio.push(`Audio ducking: ${clean(s.audioDucking)}.`);
    if (clean(s.dialogueNotes)) audio.push(`Voice / dialogue performance notes: ${clean(s.dialogueNotes)}.`);

    if (audio.length) {
      p.push(
`AUDIO MIX:
${audio.join(" ")}
Keep the mix clear and cinematic. The selected priority should remain dominant without making the other elements inaudible. Avoid sudden volume jumps unless intentionally requested.`
      );
    }

    if (clean(s.negativePrompt)) {
      const importance = project.importance?.negativePrompt || "Normal";
      const heading = importance === "Critical" ? "CRITICAL RESTRICTIONS"
        : importance === "Important" ? "IMPORTANT RESTRICTIONS" : "RESTRICTIONS";
      p.push(`${heading}:\n${clean(s.negativePrompt)}`);
    }

    p.push(
`CONTINUITY & QUALITY CONTROL:
No unintended duplicate characters. No malformed hands or fingers. No accidental text overlays, subtitles, countdowns, timers, timestamps, watermarks, or scene labels unless specifically requested.
Preserve continuity of props, wardrobe, lighting and character identity.`
    );

    if (clean(s.notes)) p.push(`ADDITIONAL NOTES:\n${clean(s.notes)}`);

    if (project.platform && project.platform !== "Generic") {
      p.push(
`FORMAT FOR PLATFORM:
Optimize the final wording and shot behavior for ${project.platform}. Keep instructions concise enough for the platform to follow, but preserve all critical identity, motion, camera, audio, and continuity requirements.`
      );
    }

    return p.join("\n\n");
  }
};
