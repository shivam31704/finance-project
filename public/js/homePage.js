function toggleModal() {
  const modal = document.getElementById("modalWrapper");
  modal.classList.toggle("active");
}

function openLoginModal() {
  const modal = document.getElementById("modalWrapper");
  modal.classList.add("active");
  toggleAuthMode("login");
}

function openSignupModal() {
  const modal = document.getElementById("modalWrapper");
  modal.classList.add("active");
  toggleAuthMode("signup");
}

function toggleAuthMode(mode) {
  const loginView = document.getElementById("loginView");
  const signupView = document.getElementById("signupView");
  const loginSwitch = document.getElementById("loginSwitch");
  const signupSwitch = document.getElementById("signupSwitch");

  if (mode === "signup") {
    loginView.classList.add("hidden");
    signupView.classList.remove("hidden");
    loginSwitch.classList.remove("active");
    signupSwitch.classList.add("active");
  } else {
    loginView.classList.remove("hidden");
    signupView.classList.add("hidden");
    loginSwitch.classList.add("active");
    signupSwitch.classList.remove("active");
  }

  clearLoginError();
  clearSignupMessages();
}

function showLoginError(message) {
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function clearLoginError() {
  const errorEl = document.getElementById("loginError");
  errorEl.textContent = "";
  errorEl.style.display = "none";
}

function showSignupError(message) {
  const errorEl = document.getElementById("signupError");
  errorEl.textContent = message;
  errorEl.style.display = "block";
}

function showSignupSuccess(message) {
  const successEl = document.getElementById("signupSuccess");
  successEl.textContent = message;
  successEl.style.display = "block";
}

function isStrongPassword(password) {
  return /^(?=.{10,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).*$/.test(
    password,
  );
}

function clearSignupMessages() {
  const errorEl = document.getElementById("signupError");
  const successEl = document.getElementById("signupSuccess");
  errorEl.textContent = "";
  errorEl.style.display = "none";
  successEl.textContent = "";
  successEl.style.display = "none";
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearLoginError();

    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showLoginError(data.message || "Login failed. Check your credentials.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (error) {
      showLoginError("Unable to login right now. Please try again.");
      console.error(error);
    }
  });
}

const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearSignupMessages();

    const username = document.getElementById("signupUsername").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    if (!isStrongPassword(password)) {
      showSignupError(
        "Use a stronger password: at least 10 characters, with uppercase, lowercase, number, and symbol.",
      );
      return;
    }

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showSignupError(data.message || "Signup failed. Try again.");
        return;
      }

      showSignupSuccess(
        data.message ||
          "Account created successfully. You can now switch to Login.",
      );
      document.getElementById("signupUsername").value = "";
      document.getElementById("signupEmail").value = "";
      document.getElementById("signupPassword").value = "";
    } catch (error) {
      showSignupError("Unable to create account right now. Please try again.");
      console.error(error);
    }
  });
}
