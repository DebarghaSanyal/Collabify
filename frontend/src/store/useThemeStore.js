import { create } from "zustand";

export const useThemeStore = create((set) => ({
    theme: localStorage.getItem("Collabify-theme") || "Night",
    setTheme: (theme) => {
        localStorage.setItem("Collabify-theme", theme);
        set({ theme });
    },
}));