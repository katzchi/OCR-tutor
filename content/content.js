// Existing content of content.js

// Function to update CSS in createCardHost to make footer justify-content: space-between
function createCardHost() {
    // Your existing code
    document.querySelector('.footer').style.justifyContent = 'space-between';
    // Existing logic
}

// .ocr-card-delete-btn styles
const css = `.ocr-card-delete-btn {
    background-color: red;
    color: white;
    border: none;
    padding: 5px 10px;
    cursor: pointer;
}`;
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = css;
document.head.appendChild(styleSheet);

// Function to show translation card
function showTranslationCard(data) {
    // Your existing logic
    const deleteButton = document.createElement('button');
    deleteButton.innerText = 'Delete';
    deleteButton.className = 'ocr-card-delete-btn';
    deleteButton.onclick = function() {
        if (confirm('Are you sure you want to delete this entry?')) {
            chrome.storage.local.get(['words'], function(result) {
                const words = result.words || [];
                const updatedWords = words.filter(word => word.id !== data.id);
                chrome.storage.local.set({words: updatedWords}, function() {
                    removeExistingCard();
                });
            });
        }
    };
    document.body.appendChild(deleteButton);
    // Preserve existing functionality
}

// Add the existing functionality here
