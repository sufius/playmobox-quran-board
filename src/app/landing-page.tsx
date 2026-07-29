"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Chip,
  Container,
  CssBaseline,
  FormControl,
  InputAdornment,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";

export type SurahListItem = {
  number: number;
  transcribedName: string;
  translatedName: string;
  arabicName: string;
  boardCount: number;
};

type Translation = {
  language: string;
  languageId: number;
  languageLabel: string;
  translationLabel: string;
};

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#9ab3ff" },
    background: { default: "#171816", paper: "#22231f" },
    text: { primary: "#f2f0e7", secondary: "#b9bab1" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: "Raleway, Arial, sans-serif",
    h3: { fontWeight: 700, letterSpacing: "-0.035em" },
  },
  components: {
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
  },
});

export default function LandingPage({
  surahs,
  translation,
}: {
  surahs: SurahListItem[];
  translation: Translation;
}) {
  const [query, setQuery] = useState("");

  const visibleSurahs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");
    if (!normalizedQuery) return surahs;

    return surahs.filter((surah) =>
      [
        String(surah.number),
        surah.transcribedName,
        surah.translatedName,
        surah.arabicName,
      ].some((value) => value.toLocaleLowerCase("de").includes(normalizedQuery)),
    );
  }, [query, surahs]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          py: { xs: 4, sm: 7 },
          background:
            "radial-gradient(circle at 85% 0%, rgba(91,131,252,.18), transparent 32rem), #171816",
        }}
      >
        <Container maxWidth="md">
          <Stack spacing={1} sx={{ mb: 4 }}>
            <Chip
              label="PLAYMOBOX"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ alignSelf: "flex-start", letterSpacing: ".13em", fontWeight: 700 }}
            />
            <Typography component="h1" variant="h3" sx={{ fontSize: { xs: "2.25rem", sm: "3rem" } }}>
              Quran Boards
            </Typography>
            <Typography color="text.secondary">
              Wähle eine Sure, um mit dem ersten Board zu beginnen.
            </Typography>
          </Stack>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, mb: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <FormControl sx={{ minWidth: { sm: 190 } }}>
                <InputLabel id="language-label">Sprache</InputLabel>
                <Select
                  labelId="language-label"
                  label="Sprache"
                  value={translation.language}
                  onChange={() => undefined}
                >
                  <MenuItem value={translation.language}>{translation.languageLabel}</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: { sm: 210 } }}>
                <InputLabel id="translation-label">Übersetzung</InputLabel>
                <Select
                  labelId="translation-label"
                  label="Übersetzung"
                  value={translation.languageId}
                  onChange={() => undefined}
                >
                  <MenuItem value={translation.languageId}>{translation.translationLabel}</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Sure suchen"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">⌕</InputAdornment>,
                  },
                }}
              />
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Box
              sx={{
                px: { xs: 2, sm: 3 },
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="subtitle2" color="text.secondary">
                SUREN
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {visibleSurahs.length} von 114
              </Typography>
            </Box>

            <List disablePadding aria-label="Liste der 114 Suren">
              {visibleSurahs.map((surah, index) => (
                <ListItemButton
                  key={surah.number}
                  component={Link}
                  href={`/surah/${surah.number}/lang/${translation.language}?board=1&edit=false`}
                  divider={index < visibleSurahs.length - 1}
                  sx={{ px: { xs: 2, sm: 3 }, py: 1.4, gap: 2 }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      flex: "0 0 auto",
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 2,
                      bgcolor: "rgba(154,179,255,.11)",
                      color: "primary.main",
                      fontWeight: 700,
                    }}
                  >
                    {surah.number}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography component="span" sx={{ fontWeight: 650 }}>
                        {surah.transcribedName}
                        <Typography component="span" color="text.secondary" sx={{ ml: 1 }}>
                          · {surah.translatedName}
                        </Typography>
                      </Typography>
                    }
                    secondary={`${surah.boardCount} ${surah.boardCount === 1 ? "Board" : "Boards"}`}
                  />
                  <Typography
                    lang="ar"
                    dir="rtl"
                    sx={{ fontFamily: "Noto Naskh Arabic, serif", fontSize: "1.35rem", color: "text.secondary" }}
                  >
                    {surah.arabicName}
                  </Typography>
                </ListItemButton>
              ))}
            </List>

            {visibleSurahs.length === 0 && (
              <Box sx={{ px: 3, py: 6, textAlign: "center" }}>
                <Typography color="text.secondary">Keine passende Sure gefunden.</Typography>
              </Box>
            )}
          </Paper>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
