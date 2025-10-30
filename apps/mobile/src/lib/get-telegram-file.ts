export async function getTelegramFileUrl(fileId) {
  const YOUR_BOT_TOKEN = `6036950537:AAGywpmHBGl1ZxNFgB9Va5SwS6mNh6HEqes`;
  const apiUrl = `https://api.telegram.org/bot${YOUR_BOT_TOKEN}/getFile?file_id=${fileId}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.ok) {
      console.log(data.result);
      const filePath = data.result.file_path;
      return {
        status: "success",
        url: `https://api.telegram.org/file/bot${YOUR_BOT_TOKEN}/${filePath}`,
        // data.result.file_path,
      }; // Returns the file path from Telegram
    } else {
      //   throw new Error("Unable to fetch file path");
      return {
        status: "fetch-failed",
      };
    }
  } catch (error) {
    console.error("Error fetching file path:", error);
    return {
      status: "fetch failed",
    };
  }
}
