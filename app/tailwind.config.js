module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        grape: "#8E97FD",
        // darkGrape: "#6E78E8",
        // darkerGrape: "#5A67D8",
        // lightBlue: "#9CD8EC",
        // blue: "#6FC3DF",
        // darkBlue: "#3FA9C9",
        // darkerBlue: "#2B7A8B",
        // lightRaspberry: "#FCD1E8",
        // raspberry: "#F895C2",
        // darkRaspberry: "#E66AAE",
        // darkerRaspberry: "#D4559E",
        // lightMint: "#B1E3CD",
        // mint: "#7FD9B8",
        // darkMint: "#2BAB7C",
        // darkerMint: "#1E7A5B",
        // peach: "#FFCC90",
        // lightYellow: "#FCE2B4",
        // yellow: "#F6C86B",
        // darkYellow: "#E9AA0A",
        // darkerYellow: "#C98908",
        charcoal: "#2E3130",
        orange: "#FF9E23",
        lightBackground: "#FDFCF9",
        cold: {
          background: "#F6F3E6",
          darkBackground: '#EFEAD3',
          darkerBackground: '#E9E1C1',
        },
        // warm: {
          background: "#FFF1E0",
          darkBackground: '#FFE5C7',
          darkerBackground: '#FFD9AE',
        // },
        mediumGrey: "#D4D1C3",
        // updated palette
        // Global Neutrals
        base: "#F5F2E7",      // Cream Background
        ink: "#1A1816",       // Near-Black for Bauhaus contrast
        muted: "#8C887E",     // Warm Grey
        divider: "#E9E5D6",   // Geometric line color

        // Category Scales
        attention: {
          surface: "#E3F3F9", // Soft Sky Wash
          main: "#6FC3DF",    // Your Cyan/Blue
          ink: "#235B6D",     // High-contrast Navy
        },
        affection: {
          surface: "#FEEAF4", // Soft Rose Wash
          main: "#F895C2",    // Your Pink/Raspberry
          ink: "#7D2E53",     // Deep Plum
        },
        initiative: {
          surface: "#FEF4E2", // Soft Amber Wash
          main: "#F6C86B",    // Your Yellow/Gold
          ink: "#7A5712",     // Deep Bronze
        },
        repair: {
          surface: "#EAF9F3", // Soft Mint Wash
          main: "#7FD9B8",    // Your Green/Mint
          ink: "#2D634F",     // Deep Forest
        },
        //
        brand: {
          darkChoc: "#3B2317",
          milkChoc: "#6B3F2A",
          lightChoc: "#A06A4B",
          citrus: "#E07A2F",
          cream: "#FFF1E",
        }
      },
      fontFamily: {
        archivo: ["ArchivoBlack", "sans-serif"],
        mono: ["JetBrainsMono", "sans-serif"],
        karla: ["Karla", "sans-serif"],
        gabarito: ["Gabarito", "sans-serif"],
      },
    },
  },
  plugins: [],
};
