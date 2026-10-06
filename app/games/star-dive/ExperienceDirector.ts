import { sectionAt, type Section } from "./config";
export interface ExperienceSection {
  enter?(): void;
  update(time: number): void;
  exit?(): void;
  dispose?(): void;
}
export class ExperienceDirector {
  section: Section = "dive";
  private scenes = new Map<Section, ExperienceSection>();
  register(id: Section, section: ExperienceSection) {
    this.scenes.set(id, section);
  }
  update(time: number) {
    const next = sectionAt(time);
    const changed = next !== this.section;
    if (changed) {
      this.scenes.get(this.section)?.exit?.();
      this.section = next;
      this.scenes.get(next)?.enter?.();
    }
    this.scenes.get(this.section)?.update(time);
    return changed;
  }
  dispose() {
    for (const scene of this.scenes.values()) scene.dispose?.();
  }
}
