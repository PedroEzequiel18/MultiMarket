if (typeof URL_BASE === "undefined") {
  var URL_BASE = "https://api.escuelajs.co/api/v1";
}

const LOGIN_PAGE = "../pages/login.html";

// O e-mail fica comentado de propósito por enquanto. opção do lider 
const EDITABLE_FIELD_IDS = [
  "profile-username-field",
  // "profile-email-field",
  "profile-role-field",
];

function displayMessage(texto, tipo = "erro") {
  const msgElement = document.getElementById("profile-message");

  if (!msgElement) {
    return;
  }

  msgElement.textContent = texto;
  msgElement.dataset.tipo = tipo;
  msgElement.style.display = "block";

  window.clearTimeout(msgElement._hideTimer);
  msgElement._hideTimer = setTimeout(() => {
    msgElement.style.display = "none";
  }, 3500);
}

function normalizeText(valor, fallback = "") {
  return valor === null || valor === undefined || valor === ""
    ? fallback
    : String(valor);
}

function fillProfile(usuario) {
  const avatar = document.getElementById("profile-avatar");
  const titulo = document.getElementById("profile-title");
  const campoId = document.getElementById("profile-id");
  const campoName =
    document.getElementById("profile-username-field") ||
    document.getElementById("profile-name-field");
  const campoEmail = document.getElementById("profile-email-field");
  const campoRole = document.getElementById("profile-role-field");
  const campoPassword = document.getElementById("profile-password-field");

  // console.log("Dados do usuário:", usuario);

  if (titulo) {
    titulo.textContent = `${normalizeText(usuario?.name, "Usuário")}`;
  }

  if (campoId) {
    campoId.value = `${normalizeText(usuario?.id, "-")}`;
  }

  if (campoName) {
    campoName.value = `${normalizeText(usuario?.name, "-")}`;
  }

  if (campoEmail) {
    campoEmail.value = `${normalizeText(usuario?.email, "-")}`;
    campoEmail.dataset.originalValue = normalizeText(usuario?.email, "");
  }

  if (campoRole) {
    campoRole.value = `${normalizeText(usuario?.role, "-")}`;
  }

  if (campoPassword) {
    campoPassword.value = "********";
  }

  if (avatar) {
    const avatarUrl =
      usuario && usuario.avatar && usuario.avatar.trim()
        ? usuario.avatar
        : "https://api.lorem.space/image/face?w=200&h=200";

    avatar.src = avatarUrl;

    const fallbackAvatar = "../src/assets/icon/profile-icon.svg";
    avatar.onerror = function () {
      this.onerror = null;
      this.src = fallbackAvatar;
    };
    avatar.alt = usuario?.name ? `Foto de ${usuario.name}` : "Foto do usuário";
  }
}

function setupEditIcons() {
  document.querySelectorAll(".input-wrapper").forEach((wrapper) => {
    const input = wrapper.querySelector("input");
    const icon = wrapper.querySelector(".edit-icon");

    if (!input || !icon) {
      return;
    }

    const canEdit = EDITABLE_FIELD_IDS.includes(input.id);

    icon.style.cursor = canEdit ? "pointer" : "not-allowed";
    icon.style.opacity = canEdit ? "1" : "0.35";
    icon.title = canEdit ? "Editar campo" : "Campo não editável";

    if (!canEdit) {
      return;
    }

    icon.addEventListener("click", () => {
      input.readOnly = !input.readOnly;

      if (!input.readOnly) {
        input.focus();
        input.select?.();
      }
    });
  });
}

function patch() {
  const avatar = document.getElementById("profile-avatar");

  if (!avatar) {
    return;
  }
  avatar.src = "https://api.lorem.space/image/face?w=200&h=200";
  avatar.alt = "Foto do usuário";
  console.log("profile avatar applied:", avatar.src);
}

async function loadProfile() {
  setTitle("Perfil - MultiMarket");
  await loadFooter("footer");
  const token = localStorage.getItem("access_token");

  if (!token) {
    window.location.href = LOGIN_PAGE;
    return;
  }

  try {
    const response = await fetch(`${URL_BASE}/auth/profile`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.status === 401 || res.status === 403) {
        throw new Error("Unauthorized");
      }
      return res;
    });
    console.log("Resposta do perfil:", response);

    if (!response.ok) {
      throw new Error(
        `Erro ao buscar perfil: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    fillProfile(data);
    setTitle(`Perfil de ${data?.name || "Usuário"} - MultiMarket`);
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
    displayMessage("Error loading profile. Please log in again.", "erro");
    window.location.href = LOGIN_PAGE;
  }
}

async function updateProfile(event) {
  if (event && event.preventDefault) event.preventDefault();

  // Lê os campos que podem ser salvos no backend.
  const id = document.getElementById("profile-id")?.value;
  const name = document.getElementById("profile-username-field")?.value?.trim() ||
    document.getElementById("profile-name-field")?.value?.trim();
  const email = document.getElementById("profile-email-field")?.value?.trim();
  const role = document.getElementById("profile-role-field")?.value?.trim();

  if (!id) {
    displayMessage("User ID not found.", "erro");
    return;
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    displayMessage("Invalid email address.", "erro");
    return;
  }

  const token = localStorage.getItem("access_token");
  if (!token) {
    displayMessage("Invalid session. Please log in again.", "erro");
    window.location.href = LOGIN_PAGE;
    return;
  }

  try {
    const currentEmail =
      document.getElementById("profile-email-field")?.dataset.originalValue ||
      "";
    if (email && email !== currentEmail) {
      const availRes = await fetch(`${URL_BASE}/users/is-available`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (availRes.ok) {
        const availData = await availRes.json();
        if (availData?.isAvailable === false) {
          displayMessage(
            "Email already registered. Please use a different one.",
            "erro",
          );
          return;
        }
      }
    }

    const body = {};
    if (name) body.name = name;
    if (email) body.email = email;
    if (role) body.role = role;

    const response = await fetch(
      `${URL_BASE}/users/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      },
    );

    if (response.ok) {
      const updated = await response.json();

      fillProfile(updated);
      const emailField = document.getElementById("profile-email-field");
      if (emailField) {
        emailField.dataset.originalValue =
          updated?.email || emailField.value || "";
      }
      displayMessage("Profile updated successfully.", "sucesso");
    } else {
      const err = await response.json().catch(() => null);
      displayMessage(
        "Update failed: " + (err?.message || response.statusText),
        "erro",
      );
      console.error("Erro updatePerfil:", err || response);
    }
  } catch (error) {
    console.error("Erro updatePerfil:", error);
    displayMessage("Error updating profile. Please try again.", "erro");
  }
}

function initProfilePage() {
  setupNavigation();
  setupEditIcons();
  doLogout();

  loadProfile().catch((error) => {
    console.error("Erro ao carregar perfil:", error);
    displayMessage("Error loading profile. Please try again.", "erro");
  });

  const profileConfirmBtn = document.querySelector(".btn.confirm");
  if (profileConfirmBtn) {
    profileConfirmBtn.addEventListener("click", updateProfile);
  }
}

async function doLogout() {
  const logout = document.querySelector(".btn.logout");

  if (logout) {
    logout.addEventListener("click", () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("userId");
      displayMessage("Logged out successfully.", "sucesso");
      window.location.href = LOGIN_PAGE;
    });
  }
}

// Funções de navegação
function setupNavigation() {
  const navShop = document.getElementById("nav-shop");
  const navCategorias = document.getElementById("nav-categorias");
  const navPerfil = document.getElementById("nav-perfil");

  if (navShop) {
    navShop.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  if (navCategorias) {
    navCategorias.addEventListener("click", () => {
      window.location.href = "index.html";
    });
  }

  if (navPerfil) {
    navPerfil.addEventListener("click", () => {
      window.location.href = "./profile.html";
    });
  }
}

window.addEventListener("app:pageLoaded", (e) => {
  if (e.detail?.page === "profile") initProfilePage();
});

if (
  document.readyState !== "loading" &&
  document.getElementById("profile-avatar")
) {
  initProfilePage();
} else {
  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("profile-avatar")) initProfilePage();
  });
}
