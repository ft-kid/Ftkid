                  break;
            case userMessage === '.git':
            case userMessage === '.github':
            case userMessage === '.sc':
            case userMessage === '.script':
            case userMessage === '.repo':
                await githubCommand(sock, chatId);
                break;
            case userMessage.startsWith('.antibadword'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo });
                    return;
                }
                
                const adminStatus = await isAdmin(sock, chatId, senderId);
                isSenderAdmin = adminStatus.isSenderAdmin;
                isBotAdmin = adminStatus.isBotAdmin;
                
                if (!isBotAdmin) {
                    await sock.sendMessage(chatId, { text: '*Bot must be admin to use this feature*', ...channelInfo });
                    return;
                }
                
                await antibadwordCommand(sock, chatId, message, senderId, isSenderAdmin);
                break;
            case userMessage.startsWith('.chatbot'):
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups.', ...channelInfo });
                    return;
                }
                
                // Check if sender is admin
                const chatbotAdminStatus = await isAdmin(sock, chatId, senderId);
                if (!chatbotAdminStatus.isSenderAdmin) {
                    await sock.sendMessage(chatId, { text: '*Only admins can use this command*', ...channelInfo });
                    return;
                }
                
                const match = userMessage.slice(8).trim();
                await handleChatbotCommand(sock, chatId, message, match);
                break;
            case userMessage.startsWith('.take'):
                const takeArgs = userMessage.slice(5).trim().split(' ');
                await takeCommand(sock, chatId, message, takeArgs);
                break;
            case userMessage === '.flirt':
                await flirtCommand(sock, chatId);
                break;
            case userMessage.startsWith('.character'):
                await characterCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.waste'):
                await wastedCommand(sock, chatId, message);
                break;
            case userMessage === '.ship':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo });
                    return;
                }
                await shipCommand(sock, chatId, message);
                break;
            case userMessage === '.groupinfo' || userMessage === '.infogp' || userMessage === '.infogrupo':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo });
                    return;
                }
                await groupInfoCommand(sock, chatId, message);
                break;
            case userMessage === '.resetlink' || userMessage === '.revoke' || userMessage === '.anularlink':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo });
                    return;
                }
                await resetlinkCommand(sock, chatId, senderId);
                break;
            case userMessage === '.staff' || userMessage === '.admins' || userMessage === '.listadmin':
                if (!isGroup) {
                    await sock.sendMessage(chatId, { text: 'This command can only be used in groups!', ...channelInfo });
                    return;
                }
                await staffCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.emojimix') || userMessage.startsWith('.emix'):
                await emojimixCommand(sock, chatId, message);
                break;
            case userMessage.startsWith('.play') || userMessage.startsWith('.song'):
                try {
                    const text = userMessage.split(' ').slice(1).join(' ');
                    if (!text) {
                        await sock.sendMessage(chatId, { 
                            text: `❌ Please provide a search term!\n\nExample: .play harleys in hawaii`,
                            ...channelInfo
                        });
                        return;
                    }

                    // Search for the video
                    const search = await yts(text);
                    if (!search.videos.length) {
                        await sock.sendMessage(chatId, { 
                            text: '❌ No results found!',
                            ...channelInfo
                        });
                        return;
                    }

                    const video = search.videos[0];
                    
                    // Send processing message
                    await sock.sendMessage(chatId, { 
                        text: `🎵 Downloading: ${video.title}\n⏳ Please wait...`,
                        ...channelInfo
                    });

                    // Download and process audio
                    const audioData = await ytdl.mp3(video.url);

                    // Get thumbnail
                    const response = await fetch(video.thumbnail);
                    const thumbBuffer = await response.buffer();

                    // Send the audio
                    await sock.sendMessage(chatId, {
                        audio: fs.readFileSync(audioData.path),
                        mimetype: 'audio/mp4',
                        fileName: `${video.title}.mp3`,
                        contextInfo: {
                            externalAdReply: {
                                title: video.title,
                                body: global.botname,
                                thumbnail: thumbBuffer,
                                mediaType: 2,
                                mediaUrl: video.url,
                            }
                        }
                    });

                    // Cleanup
                    try {
                        fs.unlinkSync(audioData.path);
                    } catch (err) {
                        console.error('Error cleaning up audio file:', err);
                    }

                } catch (error) {
                    console.error('Error in play command:', error);
                    await sock.sendMessage(chatId, { 
                        text: '❌ Failed to play audio! Try again later.',
                        ...channelInfo
                    });
                }
                break;
            case userMessage === '.vv':
                await viewOnceCommand(sock, chatId, message);
                break;
            case userMessage === '.clearsession' || userMessage === '.clearsesi':
                await clearSessionCommand(sock, chatId, senderId);
                break;
            case userMessage.startsWith('.autostatus'):
                const autoStatusArgs = userMessage.split(' ').slice(1);
                await autoStatusCommand(sock, chatId, senderId, autoStatusArgs);
                break;
            default:
                if (isGroup) {
                    // Handle non-command group messages
                    if (userMessage) {  // Make sure there's a message
                        await handleChatbotResponse(sock, chatId, message, userMessage, senderId);
                    }
                    await Antilink(message, sock);
                    await handleBadwordDetection(sock, chatId, message, userMessage, senderId);
                }
                break;
        }
    } catch (error) {
        console.error('❌ Error in message handler:', error.message);
        // Only try to send error message if we have a valid chatId
        if (chatId) {
            await sock.sendMessage(chatId, { 
                text: '❌ Failed to process command!',
                ...channelInfo
            });
        }
    }
}

// Instead, export the handlers along with handleMessages
module.exports = { 
    handleMessages,
    handleGroupParticipantUpdate: async (sock, update) => {
        const { id, participants, action, author } = update;
        console.log('Group Update in Main:', {
            id,
            participants,
            action,
            author
        });  // Add this debug log
        
        if (action === 'promote') {
            await handlePromotionEvent(sock, id, participants, author);
        } else if (action === 'demote') {
            await handleDemotionEvent(sock, id, participants, author);
        }
    },
    handleStatus: async (sock, status) => {
        await handleStatusUpdate(sock, status);
    }
};
