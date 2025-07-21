/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

/* Keep track of selected products */
let selectedProducts = [];

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      // Check if product is selected
      const isSelected = selectedProducts.some((p) => p.name === product.name);
      // Add a 'selected' class if selected
      return `
        <div class="product-card${isSelected ? " selected" : ""}" data-name="${
        product.name
      }">
          <img src="${product.image}" alt="${product.name}">
          <div class="product-info">
            <h3>${product.name}</h3>
            <p>${product.brand}</p>
            <button class="desc-btn" data-name="${
              product.name
            }">Show Description</button>
            <div class="product-desc" style="display:none;">${
              product.description
            }</div>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event listeners to each product card for selection
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      // Prevent selection if clicking the description button
      if (e.target.classList.contains("desc-btn")) return;
      const productName = card.getAttribute("data-name");
      loadProducts().then((products) => {
        const product = products.find((p) => p.name === productName);
        if (!product) return;
        const index = selectedProducts.findIndex((p) => p.name === productName);
        if (index === -1) {
          selectedProducts.push(product);
        } else {
          selectedProducts.splice(index, 1);
        }
        displayProducts(
          products.filter((p) => p.category === categoryFilter.value)
        );
        updateSelectedProducts();
      });
    });
  });

  // Add event listeners for description buttons
  document.querySelectorAll(".desc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent card selection
      const infoDiv = btn.parentElement;
      const descDiv = infoDiv.querySelector(".product-desc");
      if (descDiv.style.display === "none") {
        descDiv.style.display = "block";
        btn.textContent = "Hide Description";
      } else {
        descDiv.style.display = "none";
        btn.textContent = "Show Description";
      }
    });
  });
}

/* Helper: Save selected products to localStorage */
function saveSelectedProducts() {
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts));
}

/* Helper: Load selected products from localStorage */
function loadSelectedProducts() {
  const saved = localStorage.getItem("selectedProducts");
  if (saved) {
    selectedProducts = JSON.parse(saved);
  }
}

/* Add "Clear All" button to selected products section */
function addClearAllButton() {
  const selectedProductsDiv = document.querySelector(".selected-products");
  let clearBtn = document.getElementById("clearSelectedBtn");
  if (!clearBtn) {
    clearBtn = document.createElement("button");
    clearBtn.id = "clearSelectedBtn";
    clearBtn.className = "generate-btn";
    clearBtn.style.background = "var(--loreal-gold)";
    clearBtn.style.marginLeft = "12px";
    clearBtn.innerHTML = '<i class="fa-solid fa-trash"></i> Clear All';
    clearBtn.addEventListener("click", () => {
      selectedProducts = [];
      saveSelectedProducts();
      updateSelectedProducts();
      loadProducts().then((products) => {
        displayProducts(
          products.filter((p) => p.category === categoryFilter.value)
        );
      });
    });
    selectedProductsDiv.appendChild(clearBtn);
  }
}

/* Update selected products in the list and localStorage */
function updateSelectedProducts() {
  const selectedList = document.getElementById("selectedProductsList");
  if (selectedProducts.length === 0) {
    selectedList.innerHTML = "<p>No products selected.</p>";
  } else {
    selectedList.innerHTML = selectedProducts
      .map(
        (product, idx) => `
        <div class="selected-product">
          <img src="${product.image}" alt="${product.name}" />
          <span>${product.name}</span>
          <button class="remove-btn" data-idx="${idx}" title="Remove">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `
      )
      .join("");
  }
  saveSelectedProducts();
  addClearAllButton();

  // Add remove button event listeners
  document.querySelectorAll(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      selectedProducts.splice(idx, 1);
      saveSelectedProducts();
      // Re-render both sections
      loadProducts().then((products) => {
        displayProducts(
          products.filter((p) => p.category === categoryFilter.value)
        );
        updateSelectedProducts();
      });
    });
  });
}

// Load selected products from localStorage on page load
loadSelectedProducts();
updateSelectedProducts();

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
});

/* Conversation history for chat */
let conversationHistory = [
  {
    role: "system",
    content:
      "You are a helpful beauty advisor. Only answer questions about the generated routine, skincare, haircare, makeup, fragrance, or related beauty topics.",
  },
];

// Get reference to the Generate Routine button
const generateBtn = document.getElementById("generateRoutine");

// Helper function to call OpenAI API directly
const callOpenAI = async (messages) => {
  try {
    // Send request directly to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add your OpenAI API key below. Keep this private!
        Authorization:
          "Bearer OPENAI_API_KEY",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 400,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
};

// Add click event for generating routine
generateBtn.addEventListener("click", async () => {
  // Check if any products are selected
  if (selectedProducts.length === 0) {
    chatWindow.innerHTML =
      "<div class='placeholder-message'>Please select products to generate your routine.</div>";
    return;
  }

  // Prepare product data for OpenAI
  const productsForAI = selectedProducts.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    description: p.description,
  }));

  // Show loading message
  chatWindow.innerHTML =
    "<div class='placeholder-message'>Generating your routine...</div>";

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: `Here are my selected products: ${JSON.stringify(productsForAI)}`,
  });

  try {
    // Use the helper function to call OpenAI directly
    const data = await callOpenAI(conversationHistory);

    // Check if we got a routine from the AI
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Format each step with space between
      const steps = data.choices[0].message.content
        .split(/\n+/)
        .filter((step) => step.trim() !== "");
      chatWindow.innerHTML = `
        <div class="ai-response">
          ${steps
            .map((step) => `<div style="margin-bottom: 18px;">${step}</div>`)
            .join("")}
        </div>
      `;
      // Add AI response to history
      conversationHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
    } else {
      chatWindow.innerHTML =
        "<div class='placeholder-message'>Sorry, something went wrong. Please try again.</div>";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "<div class='placeholder-message'>Error connecting to OpenAI. Check your API key.</div>";
  }
});

/* Chat form submission handler - sends follow-up questions to OpenAI */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userInput = document.getElementById("userInput").value.trim();
  if (!userInput) return;

  // Add user question to history
  conversationHistory.push({
    role: "user",
    content: userInput,
  });

  chatWindow.innerHTML = "<div class='placeholder-message'>Thinking...</div>";

  try {
    // Send request directly to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer OPENAI_API_KEY",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: conversationHistory,
        max_tokens: 400,
      }),
    });
    const data = await response.json();
    if (
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content
    ) {
      // Show AI response
      chatWindow.innerHTML = `
        <div class="ai-response" style="margin-bottom: 18px;">
          ${data.choices[0].message.content
            .split(/\n+/)
            .map((step) => `<div style="margin-bottom: 18px;">${step}</div>`)
            .join("")}
        </div>
      `;
      // Add AI response to history
      conversationHistory.push({
        role: "assistant",
        content: data.choices[0].message.content,
      });
    } else {
      chatWindow.innerHTML =
        "<div class='placeholder-message'>Sorry, something went wrong. Please try again.</div>";
    }
  } catch (error) {
    chatWindow.innerHTML =
      "<div class='placeholder-message'>Error connecting to OpenAI. Check your API key.</div>";
  }
});
