<div align="center">

# 🎬 CzystyPlayer

**Polska platforma streamingowa w stylu Netflix — filmy, seriale, rekomendacje AI i wiele więcej.**

[![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![MariaDB](https://img.shields.io/badge/MariaDB-2_bazy-003545?style=for-the-badge&logo=mariadb&logoColor=white)](https://mariadb.org/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

---

⚠️ **Ten projekt jest objęty licencją prywatną — [szczegóły](#%EF%B8%8F-licencja)**

</div>

---

## 📑 Spis treści

- [📸 Przegląd platformy](#-przegląd-platformy)
  - [🏠 Strona powitalna](#-strona-powitalna)
  - [🔐 Autoryzacja](#-autoryzacja)
  - [🏡 Strona główna po zalogowaniu](#-strona-główna-po-zalogowaniu)
  - [🎬 Katalog treści](#-katalog-treści)
  - [🤖 Rekomendacje AI](#-rekomendacje-ai)
  - [❤️ Personalizacja](#%EF%B8%8F-personalizacja)
  - [📺 Odtwarzanie wideo](#-odtwarzanie-wideo)
- [⭐ Główne funkcjonalności](#-główne-funkcjonalności)
- [🛠️ Tech Stack](#%EF%B8%8F-tech-stack)
- [🏗️ Architektura systemu](#%EF%B8%8F-architektura-systemu)
- [📁 Struktura projektu](#-struktura-projektu)
- [🔌 Kluczowe endpointy API](#-kluczowe-endpointy-api)
- [⚠️ Licencja](#%EF%B8%8F-licencja)
- [👤 Autor](#-autor)

---

## 📸 Przegląd platformy

Poniżej wizualny przewodnik po CzystyPlayer — od strony powitalnej, przez logowanie i przeglądanie katalogu, aż po odtwarzanie materiałów wideo.

---

### 🏠 Strona powitalna

<p align="center">
  <img src="screeny/1stronapowitalnaczystyplayer.png" alt="Strona powitalna CzystyPlayer" width="100%">
</p>
<p align="center"><em>Strona powitalna — hero section z animowanym efektem typewriter i przyciskami akcji</em></p>

<br>

<p align="center">
  <img src="screeny/2stronapowitalnaPopularnetop100.png" alt="Popularne — Top 100" width="100%">
</p>
<p align="center"><em>Karuzela „Popularne — Top 100" z najchętniej oglądanymi tytułami</em></p>

<br>

<p align="center">
  <img src="screeny/3stronapowitlanlapreviewplayer.png" alt="Preview player" width="100%">
</p>
<p align="center"><em>Podgląd materiału wideo bezpośrednio ze strony powitalnej</em></p>

<br>

<p align="center">
  <img src="screeny/4stronapowitalnaoferty.png" alt="Oferty platformy" width="100%">
</p>
<p align="center"><em>Prezentacja możliwości i ofert platformy</em></p>

<br>

<p align="center">
  <img src="screeny/5stronapowitalnaplanyofertykupna.png" alt="Plany subskrypcji" width="100%">
</p>
<p align="center"><em>Plany subskrypcji i oferty zakupu</em></p>

<br>

<p align="center">
  <img src="screeny/10footerstrony.png" alt="Footer strony" width="100%">
</p>
<p align="center"><em>Footer z linkami nawigacyjnymi i informacjami o platformie</em></p>

---

### 🔐 Autoryzacja

<p align="center">
  <img src="screeny/6logowanie.png" alt="Logowanie" width="100%">
</p>
<p align="center"><em>Formularz logowania z walidacją danych</em></p>

<br>

<p align="center">
  <img src="screeny/7rejestracja.png" alt="Rejestracja" width="100%">
</p>
<p align="center"><em>Formularz rejestracji nowego konta</em></p>

---

### 🏡 Strona główna po zalogowaniu

<p align="center">
  <img src="screeny/8pozalogowaniupokazsilmowseriali.png" alt="Strona główna — filmy i seriale" width="100%">
</p>
<p align="center"><em>Strona główna po zalogowaniu — karuzele filmów i seriali</em></p>

<br>

<p align="center">
  <img src="screeny/9pozalogowaniudalszesugestieogladaniamaterialow.png" alt="Sugestie oglądania" width="100%">
</p>
<p align="center"><em>Dalsze sugestie i rekomendacje materiałów do oglądania</em></p>

---

### 🎬 Katalog treści

<p align="center">
  <img src="screeny/11seriale.png" alt="Katalog seriali" width="100%">
</p>
<p align="center"><em>Katalog seriali — filtry gatunkowe, krajowe, sortowanie i siatka posterów</em></p>

<br>

<p align="center">
  <img src="screeny/12filmy.png" alt="Katalog filmów" width="100%">
</p>
<p align="center"><em>Katalog filmów — zaawansowane filtrowanie i przeglądanie</em></p>

---

### 🤖 Rekomendacje AI

<p align="center">
  <img src="screeny/13rekomendacjeai.png" alt="Rekomendacje AI" width="100%">
</p>
<p align="center"><em>Interfejs rekomendacji AI — wyszukiwanie treści w języku naturalnym</em></p>

<br>

<p align="center">
  <img src="screeny/14wygenerowanerekomendacje.png" alt="Wygenerowane rekomendacje" width="100%">
</p>
<p align="center"><em>Wyniki rekomendacji AI — dopasowane tytuły z oceną trafności</em></p>

<br>

<p align="center">
  <img src="screeny/15mojerekomendacje.png" alt="Moje rekomendacje" width="100%">
</p>
<p align="center"><em>Historia zapisanych rekomendacji AI</em></p>

---

### ❤️ Personalizacja

<p align="center">
  <img src="screeny/16mojalistaulubionych.png" alt="Moja lista ulubionych" width="100%">
</p>
<p align="center"><em>Moja lista ulubionych filmów i seriali</em></p>

<br>

<p align="center">
  <img src="screeny/17paneluzytkownika.png" alt="Panel użytkownika" width="100%">
</p>
<p align="center"><em>Panel użytkownika — statystyki konta, dane profilu i ustawienia</em></p>

---

### 📺 Odtwarzanie wideo

<p align="center">
  <img src="screeny/18wyborfilmuinformacjeopisyprzedodpalenieszczegoly.png" alt="Szczegóły filmu" width="100%">
</p>
<p align="center"><em>Ekran szczegółów filmu — opis, obsada, oceny i dodatkowe informacje</em></p>

<br>

<p align="center">
  <img src="screeny/19zrodlafilmowdoodpalenia.png" alt="Wybór źródła wideo" width="100%">
</p>
<p align="center"><em>Wybór źródła wideo do odtworzenia — obsługa wielu hostingów</em></p>

<br>

<p align="center">
  <img src="screeny/20playerodtwarzaczvideomaterialodpalony.png" alt="Odtwarzacz wideo" width="100%">
</p>
<p align="center"><em>Odtwarzacz wideo z materiałem w trakcie odtwarzania — kontrolki, HLS streaming</em></p>

---

## ⭐ Główne funkcjonalności

| | Funkcjonalność | Opis |
|---|---|---|
| 🔐 | **System autoryzacji** | Rejestracja, logowanie, tokeny JWT (access 15 min + refresh 7 dni), zmiana hasła |
| 🎬 | **Przeglądanie filmów i seriali** | Zaawansowane filtrowanie (gatunki, kraje, lata), sortowanie, wyszukiwarka z podpowiedziami |
| 📺 | **Odtwarzacz wideo** | HLS.js streaming, obsługa wielu hostingów wideo, iframe fallback, deszyfrowanie VOE.sx |
| 🕐 | **Historia oglądania** | Kontynuuj od miejsca, w którym skończyłeś — śledzenie postępu per film/odcinek |
| ❤️ | **Moja lista ulubionych** | Zapisywanie filmów i seriali do osobistej listy |
| 🤖 | **Rekomendacje AI** | Wyszukiwanie treści w języku naturalnym za pomocą Google GenAI, scoring trafności |
| 🔍 | **Wyszukiwarka** | Wyszukiwanie z debounce i podpowiedziami w czasie rzeczywistym |
| 📱 | **Responsywny design** | Pełna obsługa urządzeń mobilnych, tabletów i desktopów |
| 🌙 | **Ciemny motyw** | Interfejs w stylu Netflix — tło `#141414`, akcent `#E50914` |
| 👤 | **Panel użytkownika** | Statystyki, dane konta, zarządzanie profilem |

---

## 🛠️ Tech Stack

| Kategoria | Technologia |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, TypeScript 5 |
| **Styling** | Tailwind CSS v4, Framer Motion 12, GSAP 3 |
| **Komponenty** | Radix UI, Lucide React (ikony) |
| **State Management** | Zustand 5, TanStack Query 5 |
| **Bazy danych** | MariaDB × 2 (użytkownicy + treści) |
| **Autoryzacja** | jose 6 (JWT), bcryptjs 3 |
| **AI** | Google GenAI (`@google/genai`) |
| **Wideo** | HLS.js 1.6 |
| **Formularze** | React Hook Form 7, Zod 4 |
| **Powiadomienia** | Sonner |
| **Build** | PostCSS, ESLint, Babel (React Compiler) |

---

## 🏗️ Architektura systemu

### Diagram ogólny

```mermaid
graph TB
    U[👤 Użytkownik] --> F[🖥️ Next.js Frontend<br>React 19 + Tailwind CSS v4]
    F --> API[⚡ API Routes<br>Next.js App Router]
    API --> DB1[(🗄️ MariaDB<br>czystyplayer<br>Użytkownicy)]
    API --> DB2[(🗄️ MariaDB<br>czystyplayerbaza<br>Treści)]
    API --> VH[🎬 Zewnętrzne<br>hostingi wideo]
    API --> AI[🤖 Google GenAI<br>Rekomendacje]

    style U fill:#E50914,stroke:#fff,color:#fff
    style F fill:#1a1a2e,stroke:#E50914,color:#fff
    style API fill:#16213e,stroke:#E50914,color:#fff
    style DB1 fill:#0f3460,stroke:#E50914,color:#fff
    style DB2 fill:#0f3460,stroke:#E50914,color:#fff
    style VH fill:#533483,stroke:#E50914,color:#fff
    style AI fill:#2b2d42,stroke:#E50914,color:#fff
```

### Przepływ streamingu wideo

```mermaid
sequenceDiagram
    participant U as 👤 Użytkownik
    participant VP as 📺 VideoPlayer
    participant R as ⚡ /api/stream/resolve
    participant S as 🔧 streaming.ts
    participant P as 🔄 /api/stream/proxy
    participant H as 🎬 Hosting wideo

    U->>VP: Kliknij „Odtwórz"
    VP->>R: Żądanie rozwiązania źródła
    R->>S: Deszyfrowanie (base64/ROT13)
    S-->>R: URL źródła HLS
    R-->>VP: Rozwiązany URL
    VP->>P: Żądanie proxy HLS
    P->>H: Pobierz segmenty wideo
    H-->>P: Dane wideo
    P-->>VP: Strumieniowanie HLS
    VP-->>U: Odtwarzanie wideo
```

### Przepływ autoryzacji

```mermaid
sequenceDiagram
    participant U as 👤 Użytkownik
    participant F as 🖥️ Frontend
    participant A as ⚡ /api/auth
    participant DB as 🗄️ MariaDB
    participant Z as 📦 Zustand Store

    U->>F: Logowanie (email + hasło)
    F->>A: POST /api/auth/login
    A->>DB: Weryfikacja danych
    DB-->>A: Dane użytkownika
    A-->>F: Access Token (15 min) + Refresh Token (7 dni)
    F->>Z: Zapisz tokeny + dane użytkownika
    Z-->>F: Stan autoryzacji
    F-->>U: Przekierowanie na stronę główną
```

### Dual Database Architecture

```
┌─────────────────────────────────┐    ┌─────────────────────────────────┐
│     czystyplayer (Użytkownicy)  │    │   czystyplayerbaza (Treści)     │
│─────────────────────────────────│    │─────────────────────────────────│
│  👤 users                       │    │  🎬 movies                      │
│  🔑 user_sessions               │    │  📺 series                      │
│  🕐 watch_progress              │    │  🎞️ episodes                    │
│  ❤️ user_likes                  │    │  🔗 sources                     │
│  📋 user_lists                  │    │  🏷️ genres                      │
│  🤖 ai_recommendations          │    │  🌍 countries                   │
│                                 │    │  👥 actors / directors           │
│  Import: @/lib/db               │    │  Import: @/lib/contentDb        │
└─────────────────────────────────┘    └─────────────────────────────────┘
```

---

## 📁 Struktura projektu

```
CzystyPlayer/
├── src/
│   ├── app/                    # Strony + API Routes (App Router)
│   │   ├── page.tsx            # Strona powitalna (Landing)
│   │   ├── browse/             # Strona główna po zalogowaniu
│   │   ├── movies/             # Katalog filmów + szczegóły [id]
│   │   ├── series/             # Katalog seriali + szczegóły [id]
│   │   ├── watch/              # Odtwarzacz (movie/[id], series/[id])
│   │   ├── ai-suggestions/     # Rekomendacje AI
│   │   ├── my-recommendations/ # Historia rekomendacji
│   │   ├── my-list/            # Moja lista ulubionych
│   │   ├── profile/            # Panel użytkownika
│   │   ├── auth/               # Logowanie + Rejestracja
│   │   └── api/                # Endpointy REST API
│   │       ├── auth/           # Autoryzacja (login, register, refresh...)
│   │       ├── content/        # Treści (movies, series, browse, filters...)
│   │       ├── stream/         # Streaming (resolve, proxy)
│   │       └── user/           # Użytkownik (my-list, likes, ai-recs)
│   ├── components/             # Komponenty React
│   │   ├── VideoPlayer.tsx     # Zaawansowany odtwarzacz wideo
│   │   ├── layout/             # StreamingNavbar, layout
│   │   ├── providers/          # ThemeProvider
│   │   └── ui/                 # Komponenty UI (Radix-based)
│   ├── hooks/                  # Custom hooks (useAuth, useTheme)
│   └── lib/                    # Logika biznesowa
│       ├── auth.ts             # JWT, weryfikacja tokenów
│       ├── db.ts               # Połączenie — baza użytkowników
│       ├── contentDb.ts        # Połączenie — baza treści
│       ├── streaming.ts        # Deszyfrowanie źródeł wideo
│       ├── types.ts            # Typy TypeScript
│       └── api/client.ts       # Klient API
├── database/                   # Schematy SQL (MariaDB)
├── public/images/              # Postery, tła, assety statyczne
└── screeny/                    # Zrzuty ekranu platformy
```

---

## 🔌 Kluczowe endpointy API

### 🔐 Autoryzacja

| Metoda | Endpoint | Opis |
|---|---|---|
| POST | `/api/auth/login` | Logowanie — zwraca access + refresh token |
| POST | `/api/auth/register` | Rejestracja nowego użytkownika |
| POST | `/api/auth/logout` | Wylogowanie — unieważnienie sesji |
| GET | `/api/auth/me` | Dane aktualnie zalogowanego użytkownika |
| POST | `/api/auth/refresh` | Odświeżenie access tokena |
| POST | `/api/auth/change-password` | Zmiana hasła |

### 🎬 Treści

| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/api/content/browse` | Strona główna — karuzele treści |
| GET | `/api/content/movies` | Lista filmów z filtrami i paginacją |
| GET | `/api/content/series` | Lista seriali z filtrami i paginacją |
| GET | `/api/content/movies/[id]` | Szczegóły filmu |
| GET | `/api/content/series/[id]` | Szczegóły serialu |
| GET | `/api/content/movies/filters` | Dostępne filtry filmów |
| GET | `/api/content/series/filters` | Dostępne filtry seriali |
| GET | `/api/content/episodes/[id]` | Informacje o odcinku |
| GET | `/api/content/suggestions` | Sugestie wyszukiwania |

### 📺 Streaming

| Metoda | Endpoint | Opis |
|---|---|---|
| POST | `/api/stream/resolve` | Rozwiązanie źródła wideo (deszyfrowanie URL) |
| GET | `/api/stream/proxy` | Proxy HLS — restreaming segmentów wideo |

### 👤 Użytkownik

| Metoda | Endpoint | Opis |
|---|---|---|
| GET | `/api/user/my-list` | Pobierz listę ulubionych |
| POST | `/api/user/my-list/toggle` | Dodaj/usuń z listy ulubionych |
| GET | `/api/user/likes` | Pobierz polubienia |
| GET | `/api/user/ai-recommendations` | Historia rekomendacji AI |
| POST | `/api/ai/recommendations` | Wygeneruj nowe rekomendacje AI |
| POST | `/api/watch` | Zapisz postęp oglądania |

---

## ⚠️ Licencja

> **🚫 Ten projekt jest objęty licencją prywatną. Wszelkie prawa zastrzeżone.**

Bez uprzedniej, wyraźnej, pisemnej zgody autora **ZABRANIA SIĘ**:

- ❌ **Kopiowania** — powielania całości lub jakiejkolwiek części projektu
- ❌ **Modyfikowania** — adaptowania, tłumaczenia lub tworzenia dzieł pochodnych
- ❌ **Dystrybucji** — udostępniania, publikowania lub przekazywania osobom trzecim
- ❌ **Użycia** — wykorzystywania w celach komercyjnych lub niekomercyjnych
- ❌ **Sublicencjonowania** — udzielania jakichkolwiek praw osobom trzecim
- ❌ **Reverse engineeringu** — dekompilacji, dezasemblacji lub inżynierii wstecznej

Naruszenie powyższych zakazów stanowi naruszenie praw autorskich i może skutkować odpowiedzialnością cywilną oraz karną.

📄 Pełna treść licencji: [LICENSE](LICENSE)

---

## 👤 Autor

**Łukasz Łapiak**

© 2026 Łukasz Łapiak. Wszelkie prawa zastrzeżone.

---

<div align="center">

*CzystyPlayer — Twoja prywatna platforma streamingowa* 🎬

</div>
