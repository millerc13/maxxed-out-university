// ==UserScript==
// @name         Grok Imagine Cleanup API
// @namespace    http://tampermonkey.net/
// @version      2.3
// @description  Bulk delete Grok Imagine posts via API
// @match        https://grok.com/imagine/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(async function() {
  function delay(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Extract UUID from URL or raw UUID string
  function extractPostId(input) {
    // If it's already a UUID, return it
    var uuidPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if (uuidPattern.test(input)) {
      return input;
    }

    // Try to extract UUID from URL
    var urlMatch = input.match(/\/imagine\/post\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (urlMatch) {
      return urlMatch[1];
    }

    // Try to find any UUID in the string
    var anyUuidMatch = input.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (anyUuidMatch) {
      return anyUuidMatch[1];
    }

    return null;
  }

  async function deletePost(postId) {
    try {
      var response = await fetch("https://grok.com/rest/media/post/delete", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "content-type": "application/json",
          "x-xai-request-id": generateUUID()
        },
        credentials: "include",
        body: JSON.stringify({ id: postId })
      });

      if (response.ok) {
        console.log("Deleted: " + postId);
        return true;
      } else {
        var text = await response.text();
        console.log("Failed to delete " + postId + ": " + response.status + " - " + text);
        return false;
      }
    } catch (err) {
      console.log("Error deleting " + postId + ": " + err.message);
      return false;
    }
  }

  async function unlikePost(postId) {
    try {
      var response = await fetch("https://grok.com/rest/media/post/unlike", {
        method: "POST",
        headers: {
          "accept": "*/*",
          "content-type": "application/json",
          "x-xai-request-id": generateUUID()
        },
        credentials: "include",
        body: JSON.stringify({ id: postId })
      });

      if (response.ok) {
        console.log("Unliked: " + postId);
        return true;
      } else {
        console.log("Failed to unlike " + postId + ": " + response.status);
        return false;
      }
    } catch (err) {
      console.log("Error unliking " + postId + ": " + err.message);
      return false;
    }
  }

  async function collectPostIds() {
    var postIds = [];
    var cards = document.querySelectorAll('[role="listitem"]');

    cards.forEach(function(card) {
      var link = card.querySelector('a[href*="/imagine/post/"]');
      if (link) {
        var match = link.href.match(/\/imagine\/post\/([a-f0-9-]+)/i);
        if (match) {
          postIds.push(match[1]);
          return;
        }
      }

      var img = card.querySelector("img");
      if (img && img.src) {
        var uuidMatch = img.src.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch) {
          postIds.push(uuidMatch[1]);
        }
      }
    });

    return [...new Set(postIds)];
  }

  async function scrollAndCollectAll() {
    var allPostIds = [];
    var lastCount = 0;
    var noNewPostsCount = 0;

    console.log("Scrolling to collect all post IDs...");

    while (noNewPostsCount < 3) {
      var currentIds = await collectPostIds();

      currentIds.forEach(function(id) {
        if (allPostIds.indexOf(id) === -1) {
          allPostIds.push(id);
        }
      });

      console.log("Collected " + allPostIds.length + " post IDs so far...");

      if (allPostIds.length === lastCount) {
        noNewPostsCount++;
      } else {
        noNewPostsCount = 0;
        lastCount = allPostIds.length;
      }

      window.scrollTo(0, document.body.scrollHeight);
      await delay(2000);
    }

    console.log("Finished collecting. Total: " + allPostIds.length + " posts");
    return allPostIds;
  }

  // Define helper functions on window
  window.grokCollectIds = async function() {
    console.log("Collecting post IDs...");
    var ids = await scrollAndCollectAll();
    console.log("Found " + ids.length + " posts:");
    console.log(JSON.stringify(ids, null, 2));
    return ids;
  };

  window.grokCollectAndDelete = async function() {
    console.log("Collecting post IDs...");
    var ids = await scrollAndCollectAll();

    if (ids.length === 0) {
      console.log("No posts found!");
      return;
    }

    console.log("Found " + ids.length + " posts. Starting deletion...");

    var processed = 0;
    var errors = 0;

    for (var i = 0; i < ids.length; i++) {
      var postId = ids[i];

      // Unlike first (remove from favorites)
      await unlikePost(postId);
      await delay(300);

      // Then delete
      var success = await deletePost(postId);
      if (success) {
        processed++;
      } else {
        errors++;
      }

      await delay(700);

      if ((i + 1) % 10 === 0) {
        console.log("Progress: " + (i + 1) + "/" + ids.length + " (" + processed + " deleted, " + errors + " errors)");
      }
    }

    console.log("==============================================");
    console.log("DONE!");
    console.log("Deleted: " + processed);
    console.log("Errors: " + errors);
    console.log("==============================================");

    window.location.reload();
  };

  window.grokDeleteIds = async function(ids) {
    if (!ids || ids.length === 0) {
      console.log("No IDs provided!");
      return;
    }

    console.log("Deleting " + ids.length + " posts...");

    var processed = 0;
    var errors = 0;

    for (var i = 0; i < ids.length; i++) {
      var postId = ids[i];

      await unlikePost(postId);
      await delay(300);

      var success = await deletePost(postId);
      if (success) {
        processed++;
      } else {
        errors++;
      }

      await delay(700);

      if ((i + 1) % 10 === 0) {
        console.log("Progress: " + (i + 1) + "/" + ids.length);
      }
    }

    console.log("==============================================");
    console.log("DONE!");
    console.log("Deleted: " + processed);
    console.log("Errors: " + errors);
    console.log("==============================================");

    window.location.reload();
  };

  window.grokDeleteOnly = async function(ids) {
    if (!ids || ids.length === 0) {
      console.log("No IDs provided!");
      return;
    }

    console.log("Deleting " + ids.length + " posts (skip unlike)...");

    var processed = 0;
    var errors = 0;

    for (var i = 0; i < ids.length; i++) {
      var postId = ids[i];

      var success = await deletePost(postId);
      if (success) {
        processed++;
      } else {
        errors++;
      }

      await delay(500);

      if ((i + 1) % 10 === 0) {
        console.log("Progress: " + (i + 1) + "/" + ids.length);
      }
    }

    console.log("==============================================");
    console.log("DONE!");
    console.log("Deleted: " + processed);
    console.log("Errors: " + errors);
    console.log("==============================================");

    window.location.reload();
  };

  // Delete posts from URLs or mixed URL/ID array
  window.grokDeleteUrls = async function(urls) {
    if (!urls || urls.length === 0) {
      console.log("No URLs provided!");
      return;
    }

    // Convert URLs to post IDs
    var ids = [];
    var skipped = [];

    for (var i = 0; i < urls.length; i++) {
      var postId = extractPostId(urls[i]);
      if (postId) {
        ids.push(postId);
      } else {
        skipped.push(urls[i]);
      }
    }

    if (skipped.length > 0) {
      console.log("Skipped " + skipped.length + " invalid entries:");
      skipped.forEach(function(s) { console.log("  - " + s); });
    }

    if (ids.length === 0) {
      console.log("No valid post IDs found!");
      return;
    }

    console.log("Processing " + ids.length + " posts...");

    var unliked = 0;
    var deleted = 0;
    var errors = 0;

    for (var i = 0; i < ids.length; i++) {
      var postId = ids[i];
      console.log("Processing " + (i + 1) + "/" + ids.length + ": " + postId);

      // Unlike first
      var unlikeSuccess = await unlikePost(postId);
      if (unlikeSuccess) unliked++;
      await delay(300);

      // Then delete
      var deleteSuccess = await deletePost(postId);
      if (deleteSuccess) {
        deleted++;
      } else {
        errors++;
      }

      await delay(700);
    }

    console.log("==============================================");
    console.log("DONE!");
    console.log("Unliked: " + unliked);
    console.log("Deleted: " + deleted);
    console.log("Errors: " + errors);
    console.log("==============================================");
  };

  // Delete current page's post (when viewing a single post)
  window.grokDeleteThis = async function() {
    var postId = extractPostId(window.location.href);

    if (!postId) {
      console.log("Not on a post page! URL: " + window.location.href);
      return;
    }

    console.log("Deleting current post: " + postId);

    await unlikePost(postId);
    await delay(300);

    var success = await deletePost(postId);

    if (success) {
      console.log("Post deleted successfully!");
      // Navigate back or to main page
      window.history.back();
    } else {
      console.log("Failed to delete post.");
    }
  };

  window.grokStop = function() {
    console.log("To stop, just refresh the page.");
  };

  // Wait for page to load
  await delay(2000);

  console.log("==============================================");
  console.log("Grok Cleanup v2.3 (API version)");
  console.log("");
  console.log("Commands:");
  console.log("  grokCollectAndDelete() - Collect all & delete");
  console.log("  grokCollectIds()       - Just collect IDs");
  console.log("  grokDeleteIds([...])   - Delete specific IDs");
  console.log("  grokDeleteUrls([...])  - Delete from URLs or IDs");
  console.log("  grokDeleteThis()       - Delete current post");
  console.log("  grokDeleteOnly([...])  - Delete without unlike");
  console.log("==============================================");
})();
