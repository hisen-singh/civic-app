const targetUid = "80F9ythfWSPNDsmf2FQGoCVk3hZ2";
const url = "https://us-central1-civic-d0574.cloudfunctions.net/setAdminRole";

fetch(url, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { targetUid } }),
})
.then(res => res.json())
.then(data => {
    console.log("Response:", data);
})
.catch(console.error);
