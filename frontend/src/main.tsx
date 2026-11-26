import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// CSS sırası vacibdir: əsas üslub, sonra giriş pəncərəsi, sonra yeni xüsusiyyətlər
import "./styles.css";
import "./auth.css";
import "./features.css";
import App from "./App";
import { LanguageProvider } from "./i18n";
import { ToastProvider } from "./toast";
import { AuthProvider } from "./Auth";
import { FavoritesProvider } from "./favorites";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <FavoritesProvider>
            <App />
          </FavoritesProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  </StrictMode>,
);
