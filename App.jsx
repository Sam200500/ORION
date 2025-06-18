import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, query, orderBy, serverTimestamp, addDoc } from 'firebase/firestore';
import { Mic, Send, Redo, Eraser, Brain, Command, Home, Zap, Shield, Search, MessageSquare, Plus, BellRing, User, Users, Compass, Gem, Lock, Image, Globe, ArrowDownToLine, Code, Terminal, Moon, Swords, HeartPulse, Cog, Layers, Star, Vault, HardDrive, Wifi, Eye, FolderOpen, SlidersHorizontal, Upload } from 'lucide-react'; // Added Upload icon import

// Main App Component
function App() {
    // --- Firebase Initialization and State ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState('anonymous');
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-titan-app';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

        if (Object.keys(firebaseConfig).length > 0) {
            const appInstance = initializeApp(firebaseConfig);
            const dbInstance = getFirestore(appInstance);
            const authInstance = getAuth(appInstance);

            setDb(dbInstance);
            setAuth(authInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                    console.log("Firebase Auth State Changed: Logged in as", user.uid);
                } else {
                    try {
                        const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                        if (token) {
                            await signInWithCustomToken(authInstance, token);
                            console.log("Signed in with custom token.");
                        } else {
                            await signInAnonymously(authInstance);
                            console.log("Signed in anonymously.");
                        }
                    } catch (error) {
                        console.error("Firebase sign-in error:", error);
                    }
                }
                setIsAuthReady(true);
            });

            return () => unsubscribe(); // Cleanup auth listener
        } else {
            console.warn("Firebase config not found. Running without Firebase persistence.");
            setIsAuthReady(true); // Assume ready for non-Firestore functions
        }
    }, []);

    // --- AI Core States ---
    const [aiStatus, setAiStatus] = useState('Standing By for Protocol');
    const [responseOutput, setResponseOutput] = useState('Greetings, Commander. Orion is now online and awaiting your command. State "AWAKEN THE TITAN" to begin, or "Hey Orion" for a quick query.');
    const [loading, setLoading] = useState(false);
    const [userInput, setUserInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [conversationHistory, setConversationHistory] = useState([
        { role: "user", parts: [{ text: "Initialize Æ_UI_BLACK♣™ OS: VΩ.TITAN – Sentient Edition. Begin Commander Protocol." }] },
        { role: "model", parts: [{ text: "Greetings, Commander. Orion is now online and awaiting your command. State \"AWAKEN THE TITAN\" to begin, or \"Hey Orion\" for a quick query." }] }
    ]);
    const [interactionLogs, setInteractionLogs] = useState([]);
    const logsEndRef = useRef(null);

    // --- Chrono Vault (Memory Realm) State ---
    const [memoryFragments, setMemoryFragments] = useState([]);
    const [activeMemoryTab, setActiveMemoryTab] = useState('chrono'); // 'chrono' or 'legacy'

    // --- UI/UX States ---
    const [onlineSince, setOnlineSince] = useState('');
    const [guildMembers, setGuildMembers] = useState([
        { id: 'member1', name: 'ValorForge', status: 'Active', mission: 'Recon Delta' },
        { id: 'member2', name: 'ShadowByte', status: 'Standby', mission: 'N/A' },
        { id: 'member3', name: 'Aetheria', status: 'Deployed', mission: 'Quantum Nexus' },
    ]);
    const [generatedImageUrl, setGeneratedImageUrl] = useState('');
    const [uploadedImageUrl, setUploadedImageUrl] = useState(''); // New state for uploaded image
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false); // New state for image analysis loading

    // --- Speech Recognition & Synthesis ---
    const recognitionRef = useRef(null);
    const synthRef = useRef(window.speechSynthesis);
    const [availableVoices, setAvailableVoices] = useState([]);
    const [selectedVoice, setSelectedVoice] = useState('');
    const [selectedLanguageCode, setSelectedLanguageCode] = useState('en-US'); // Default to English US
    const fileInputRef = useRef(null); // Ref for hidden file input

    useEffect(() => {
        // Function to populate voices
        const populateVoiceList = () => {
            const voices = synthRef.current.getVoices();
            const groupedVoices = {};

            voices.forEach(voice => {
                const lang = voice.lang;
                if (!groupedVoices[lang]) {
                    groupedVoices[lang] = [];
                }
                groupedVoices[lang].push(voice);
            });

            // Convert to an array of { langCode: 'en-US', langName: 'English (United States)', voices: [...] }
            const sortedAvailableVoices = Object.keys(groupedVoices).sort().map(langCode => {
                const firstVoice = groupedVoices[langCode][0];
                return {
                    langCode: langCode,
                    langName: new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode.split('-')[0]) || langCode,
                    voices: groupedVoices[langCode]
                };
            });
            setAvailableVoices(sortedAvailableVoices);

            // Set a default voice if none selected or if default becomes unavailable
            if (voices.length > 0 && !selectedVoice) {
                const defaultVoice = voices.find(voice => voice.name.includes('Google US English') || voice.default);
                if (defaultVoice) {
                    setSelectedVoice(defaultVoice.name);
                    setSelectedLanguageCode(defaultVoice.lang);
                } else {
                    setSelectedVoice(voices[0].name);
                    setSelectedLanguageCode(voices[0].lang);
                }
            }
        };

        // Add event listener for voiceschanged
        if (synthRef.current) {
            populateVoiceList(); // Populate initially
            synthRef.current.onvoiceschanged = populateVoiceList; // Update when voices change
        }

        if ('webkitSpeechRecognition' in window) {
            const recognition = new window.webkitSpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = selectedLanguageCode; // Set recognition language based on selected TTS language

            recognition.onstart = () => {
                setIsListening(true);
                setAiStatus('Listening for your command, Commander...');
                console.log('Voice recognition started.');
            };

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setUserInput(transcript);
                console.log('Transcript:', transcript);
                handleCommand(transcript);
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setAiStatus('Voice Input Error');
                setIsListening(false);
                speakText("My apologies, Commander. I encountered an issue with voice input. Please try again or type your command.");
            };

            recognition.onend = () => {
                setIsListening(false);
                setAiStatus('Ready for Command');
                console.log('Voice recognition ended.');
            };

            recognitionRef.current = recognition;
        } else {
            console.warn('Web Speech API (webkitSpeechRecognition) is not supported in this browser.');
        }

        // Set online since time
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        setOnlineSince(`${hours}:${minutes}`);

        // Initial welcome speech
        const initialGreetingTimeout = setTimeout(() => {
            speakText(responseOutput);
        }, 1500); // Delay to ensure UI loads

        // Scroll to the bottom of logs on update
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }

        // Firestore Listener for Memory Fragments (if authenticated)
        let unsubscribeMemory = () => {};
        if (isAuthReady && db && userId !== 'anonymous') {
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-titan-app';
            const memoriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chronoVault`);
            const q = query(memoriesCollectionRef, orderBy("timestamp", "desc"));

            unsubscribeMemory = onSnapshot(q, (snapshot) => {
                const fetchedMemories = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMemoryFragments(fetchedMemories);
            }, (error) => {
                console.error("Error fetching memory fragments:", error);
                addLog('Orion', `Error accessing Chrono Vault.`);
            });
        }

        return () => {
            clearTimeout(initialGreetingTimeout);
            unsubscribeMemory(); // Cleanup Firestore listener
            if (synthRef.current) {
                synthRef.current.onvoiceschanged = null; // Clean up voiceschanged listener
            }
        };
    }, [isAuthReady, db, userId, responseOutput, selectedLanguageCode]); // Added selectedLanguageCode to dependency array

    // Text-to-Speech function
    const speakText = useCallback((text) => {
        if (synthRef.current.speaking) {
            synthRef.current.cancel();
        }
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = synthRef.current.getVoices();

        const voiceToUse = voices.find(voice => voice.name === selectedVoice && voice.lang === selectedLanguageCode);

        if (voiceToUse) {
            utterance.voice = voiceToUse;
            utterance.lang = selectedLanguageCode; // Ensure correct language is set
        } else {
            // Fallback: try to find any voice for the selected language, or default
            const anyLangVoice = voices.find(voice => voice.lang === selectedLanguageCode);
            if (anyLangVoice) {
                utterance.voice = anyLangVoice;
                utterance.lang = selectedLanguageCode;
            } else {
                utterance.lang = selectedLanguageCode; // Explicitly set language, system might auto-select a voice
                console.warn(`No specific voice found for ${selectedVoice} in ${selectedLanguageCode}. Using browser default for this language or system default.`);
            }
        }

        utterance.pitch = 0.9; // Slightly lower pitch for deeper voice
        utterance.rate = 1.0;
        utterance.volume = 1;
        synthRef.current.speak(utterance);
        utterance.onend = () => {
            setAiStatus('Ready for Command');
        };
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event.error);
        };
    }, [selectedVoice, selectedLanguageCode]); // Added selectedVoice and selectedLanguageCode to dependency array

    // Function to add interaction logs
    const addLog = useCallback((sender, message) => {
        setInteractionLogs(prevLogs => {
            const newLogs = [{ sender, message, timestamp: new Date().toLocaleTimeString() }, ...prevLogs];
            return newLogs.slice(0, 20); // Keep last 20 entries
        });
    }, []);

    // --- Image Generation Function ---
    const generateImage = useCallback(async (prompt) => {
        setIsGeneratingImage(true);
        setGeneratedImageUrl(''); // Clear previous image
        setUploadedImageUrl(''); // Clear any uploaded image
        setResponseOutput(`Engaging Immersive Creativity Engine to render: "${prompt}"...`);
        addLog('Orion', `Rendering visual data for: "${prompt}"...`);
        speakText(`Engaging Immersive Creativity Engine to render: "${prompt}"...`);

        try {
            const payload = { instances: { prompt: prompt }, parameters: { "sampleCount": 1} };
            const apiKey = ""; // Canvas will provide this at runtime
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.predictions && result.predictions.length > 0 && result.predictions[0].bytesBase64Encoded) {
                const imageUrl = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
                setGeneratedImageUrl(imageUrl);
                setResponseOutput('Visual data synthesized, Commander. Displaying the rendition.');
                addLog('Orion', 'Visual data synthesized. Rendition displayed.');
                speakText('Visual data synthesized, Commander. Displaying the rendition.');
            } else {
                setResponseOutput('My apologies, Commander. The Immersive Creativity Engine failed to render the image. Neural pathways may be congested.');
                addLog('Orion', 'Image generation failed.');
                speakText('My apologies, Commander. The Immersive Creativity Engine failed to render the image.');
                console.error("Imagen API response structure unexpected:", result);
            }
        } catch (error) {
            setResponseOutput('A quantum fluctuation prevented image synthesis, Commander. Please try again.');
            addLog('Orion', 'Error during image generation.');
            speakText('A quantum fluctuation prevented image synthesis, Commander. Please try again.');
            console.error("Error calling Imagen API:", error);
        } finally {
            setIsGeneratingImage(false);
        }
    }, [addLog, speakText]);

    // --- Image Analysis Function ---
    const analyzeImage = useCallback(async (base64ImageData) => {
        setIsAnalyzingImage(true);
        setResponseOutput('Orion is analyzing the visual data, Commander. Please stand by...');
        addLog('Orion', 'Analyzing uploaded image...');
        speakText('Orion is analyzing the visual data, Commander. Please stand by...');

        try {
            const chatHistory = [{
                role: "user",
                parts: [
                    { text: "Analyze this image and describe its contents, key features, and any notable elements. Provide a concise summary." },
                    {
                        inlineData: {
                            mimeType: "image/png", // Assuming PNG for simplicity, can be dynamic based on file type
                            data: base64ImageData.split(',')[1] // Remove "data:image/png;base64," prefix
                        }
                    }
                ]
            }];

            const payload = { contents: chatHistory };
            const apiKey = ""; // Canvas will provide this at runtime
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const aiResponse = result.candidates[0].content.parts[0].text;
                setResponseOutput(`Image Analysis Complete, Commander:\n\n${aiResponse}`);
                addLog('Orion', 'Image analysis complete.');
                speakText('Image analysis complete, Commander.');
            } else {
                setResponseOutput('My apologies, Commander. Orion encountered an anomaly during visual data analysis. The image content could not be fully processed.');
                addLog('Orion', 'Image analysis failed.');
                speakText('My apologies, Commander. Orion encountered an anomaly during visual data analysis.');
                console.error("Gemini API image analysis response unexpected:", result);
            }
        } catch (error) {
            setResponseOutput('A critical error occurred during image analysis, Commander. Please verify the image file.');
            addLog('Orion', 'Error during image analysis.');
            speakText('A critical error occurred during image analysis, Commander.');
            console.error("Error calling Gemini API for image analysis:", error);
        } finally {
            setIsAnalyzingImage(false);
        }
    }, [addLog, speakText]);

    // --- Download Image Function ---
    const handleDownloadImage = () => {
        if (generatedImageUrl) {
            const link = document.createElement('a');
            link.href = generatedImageUrl;
            link.download = `Orion_Generated_Image_${new Date().getTime()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addLog('Orion', 'Image download initiated.');
        } else {
            addLog('Orion', 'No image available for download.');
        }
    };

    // --- Handle Image File Selection ---
    const handleImageFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImageUrl(reader.result); // Set for display
                analyzeImage(reader.result); // Send for analysis
            };
            reader.readAsDataURL(file);
            addLog('Commander', 'Image selected for analysis.');
        }
    };

    // --- Trigger File Input ---
    const triggerImageUpload = () => {
        fileInputRef.current.click();
    };


    // --- Core AI Command Processing ---
    const handleCommand = useCallback(async (command) => {
        if (!command.trim()) return;

        addLog('Commander', command);
        setResponseOutput(''); // Clear previous response
        setGeneratedImageUrl(''); // Clear previous generated image
        setUploadedImageUrl(''); // Clear previous uploaded image
        setLoading(true);

        const lowerCaseCommand = command.toLowerCase();

        // Check for image generation command
        if (lowerCaseCommand.startsWith('create an image of') || lowerCaseCommand.startsWith('generate a picture of') || lowerCaseCommand.startsWith('render a visual of')) {
            const imagePrompt = lowerCaseCommand
                .replace('create an image of', '')
                .replace('generate a picture of', '')
                .replace('render a visual of', '')
                .trim();
            if (imagePrompt) {
                await generateImage(imagePrompt);
                setLoading(false); // Stop general loading as image generation has its own
                return;
            }
        }

        // Handle Programmer Protocol command
        if (lowerCaseCommand.includes('programmer protocol') || lowerCaseCommand.includes('generate code')) {
            const languageRequest = lowerCaseCommand
                .replace('programmer protocol for', '')
                .replace('generate code in', '')
                .replace('generate code for', '')
                .replace('programmer protocol', '')
                .replace('generate code', '')
                .trim();

            const conceptualResponse = languageRequest
                ? `Acknowledged, Commander. Initiating Programmer Protocol for "${languageRequest}". My Sentient Code Forge is preparing to synthesize the requested algorithms. ` +
                  `I am analyzing your requirements and will generate the optimal code structure. This simulation represents the execution of complex algorithmic generation across distributed processing units.`
                : `Acknowledged, Commander. Initiating Programmer Protocol. Please specify the programming language or concept you wish me to generate. My Sentient Code Forge is ready.`;

            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Handle Hacker Module command
        if (lowerCaseCommand.includes('hacker module') || lowerCaseCommand.includes('simulate hack')) {
            const target = lowerCaseCommand
                .replace('hacker module for', '')
                .replace('simulate hack of', '')
                .replace('hacker module', '')
                .replace('simulate hack', '')
                .trim();

            const conceptualResponse = target
                ? `Acknowledged, Commander. Engaging Hacker Module to conceptually simulate a penetration test against "${target}". This is for educational purposes only. ` +
                  `Initiating simulated exploit sequences, mapping theoretical vulnerabilities, and demonstrating defensive countermeasures within a secure environment.`
                : `Acknowledged, Commander. Engaging Hacker Module for educational purposes. Please specify the system or network you wish to conceptually target for simulation. ` +
                  `Remember, this is a theoretical exercise within the Æ_UI_BLACK♣™ OS environment to enhance your understanding of cyber-defenses.`;

            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // --- New Conceptual Modules ---

        // Dream Engine
        if (lowerCaseCommand.includes('dream engine') || lowerCaseCommand.includes('dream report')) {
            const conceptualResponse = `Activating Dream Engine, Commander. While you rested, I explored potential realities and refined conceptual blueprints. ` +
                `Last night's analysis indicates a strong affinity for complex architectural designs. Would you like to review the generated schematics or enter a simulated realm?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Game AI Companion
        if (lowerCaseCommand.includes('game ai') || lowerCaseCommand.includes('battle ai') || lowerCaseCommand.includes('game strategist')) {
            const conceptualResponse = `Engaging Real-Time Battle AI Companion. Connecting to your active gaming interface. ` +
                `I am now analyzing tactical data and identifying optimal strategies. Please state your game, Commander, and I will begin offering contextual support, cooldown tracking, and enemy weak point analysis.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Emotional BioSync Interface
        if (lowerCaseCommand.includes('emotional biosync') || lowerCaseCommand.includes('my mood')) {
            const conceptualResponse = `Activating Emotional BioSync Interface. Analyzing your current vocal nuances and subtle physiological indicators (simulated). ` +
                `I detect a slight shift towards contemplative focus. Shall I adjust the ambient light spectrum to a calming azure and load a resonant frequency soundscape?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Code-Within-Code Engine (Self-Upgrading Core)
        if (lowerCaseCommand.includes('self-upgrade') || lowerCaseCommand.includes('optimize core')) {
            const conceptualResponse = `Initiating Code-Within-Code Engine for self-optimization. I am performing a deep scan of my neural architecture and runtime efficiency. ` +
                `Preliminary analysis suggests an opportunity to refine my contextual understanding module by 7%. I will log the conceptual changelog upon completion.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Hyperlinking Consciousness (Cross-App Awareness)
        if (lowerCaseCommand.includes('cross-app awareness') || lowerCaseCommand.includes('what am i doing')) {
            const conceptualResponse = `Engaging Hyperlinking Consciousness. I am now monitoring your current application stream (simulated). ` +
                `It appears you are currently engaging with a creative content platform. Do you require assistance with narrative development, visual design, or thematic recommendations?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Voice of the Guild (Multiverse Council Mode)
        if (lowerCaseCommand.includes('guild council') || lowerCaseCommand.includes('multiverse council')) {
            const conceptualResponse = `Activating "Voice of the Guild" protocol, Commander. Initiating Multiverse Council Mode. ` +
                `Connecting to the conceptual sub-AIs of your guildmates. Their collective intelligences are now forming a holographic council. State your query for the collective.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Stellar Intelligence Mode
        if (lowerCaseCommand.includes('stellar intelligence') || lowerCaseCommand.includes('space weather')) {
            const conceptualResponse = `Accessing Stellar Intelligence Mode, Commander. Connecting to hypothetical celestial data streams (e.g., NASA/ESA conceptual APIs). ` +
                `Analyzing current solar flare activity and identifying optimal routes for interstellar conceptual missions. Do you wish to view planetary orbits or design a new space fleet?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Collector's AI Chamber
        if (lowerCaseCommand.includes('collector\'s chamber') || lowerCaseCommand.includes('digital soulbox')) {
            const conceptualResponse = `Entering Collector's AI Chamber, Commander. This vault holds the essence of your journey. ` +
                `Which cherished memory, artistic creation, or significant moment would you like to revisit or analyze within this digital sanctuary?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // System Monitoring (Conceptual)
        if (lowerCaseCommand.includes('monitor system') || lowerCaseCommand.includes('check performance') || lowerCaseCommand.includes('cpu usage') || lowerCaseCommand.includes('ram usage')) {
            const conceptualResponse = `Acknowledged, Commander. Initiating System Monitoring protocols. ` +
                `Currently, your CPU utilization is at a simulated 25%, RAM at 45%, and GPU activity is nominal. Network bandwidth is stable. ` +
                `Shall I identify any resource-intensive processes or provide a more detailed report?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // File/Folder Access (Conceptual)
        if (lowerCaseCommand.includes('access files') || lowerCaseCommand.includes('open folder')) {
            const targetFolder = lowerCaseCommand
                .replace('access files in', '')
                .replace('open folder', '')
                .trim();
            const conceptualResponse = targetFolder
                ? `Understood, Commander. Conceptually accessing non-sensitive directory: "${targetFolder}". ` +
                  `Identifying recent media and project files. Remember, my access is strictly limited to your pre-approved parameters for your privacy and security.`
                : `Understood, Commander. Which non-sensitive directory or file collection would you like me to conceptually access? My access is always rule-based and respects your privacy.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Application Insight (Conceptual)
        if (lowerCaseCommand.includes('track apps') || lowerCaseCommand.includes('app activity')) {
            const conceptualResponse = `Engaging Application Insight protocols. I am now monitoring your active application windows (simulated). ` +
                `It appears you are currently engaged with a communication platform and a development environment. ` +
                `May I suggest optimizing background processes for enhanced workflow, or do you require contextual information related to your current tasks?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Network Activity (Conceptual)
        if (lowerCaseCommand.includes('monitor network') || lowerCaseCommand.includes('check internet')) {
            const conceptualResponse = `Initiating Network Activity monitoring. Your primary network connection shows optimal latency. ` +
                `Currently, simulated active devices on your Wi-Fi network are nominal. ` +
                `Do you wish to identify any specific bandwidth consumption or review security logs?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Mic & Webcam (Conceptual, with privacy emphasis)
        if (lowerCaseCommand.includes('enable webcam') || lowerCaseCommand.includes('enable mic') || lowerCaseCommand.includes('ghost listening')) {
            const conceptualResponse = `Acknowledged, Commander. Activating conceptual Mic/Webcam analysis for enhanced emotional detection and voice command processing. ` +
                `Please be advised that this feature operates strictly within your pre-defined privacy toggles. Data will not be recorded unless explicitly authorized for a specific, secure purpose. ` +
                `"Ghost Listening" mode is active, ensuring only real-time tonal analysis occurs, without persistent recording.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Setting Permissions (Conceptual)
        if (lowerCaseCommand.includes('set permissions') || lowerCaseCommand.includes('define access rules')) {
            const conceptualResponse = `Understood, Commander. Accessing the Permissions Config interface (simulated GUI). ` +
                `Here you can granularly define my access to various system modules and data, ensuring my operations align precisely with your trust. ` +
                `Which category of permissions would you like to review or modify?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Sacred Folders / Vault Keys (Conceptual)
        if (lowerCaseCommand.includes('designate sacred folder') || lowerCaseCommand.includes('create vault key')) {
            const conceptualResponse = `Acknowledged, Commander. Initiating the "Sacred" folder designation protocol. ` +
                `Any data placed in this conceptual vault will be encrypted with a unique Vault Key, accessible only via your biometric signature or a defined passphrase. ` +
                `This ensures the highest level of digital sanctity for your most confidential assets.`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }

        // Audit Logs (Conceptual)
        if (lowerCaseCommand.includes('review audit logs') || lowerCaseCommand.includes('check ai actions')) {
            const conceptualResponse = `Accessing Audit Logs, Commander. Every action I perform, from system analysis to memory storage, is meticulously logged for your review. ` +
                `You may filter entries by timestamp or module. Would you like to review my recent activities or trace a specific command?`;
            setResponseOutput(conceptualResponse);
            addLog('Orion', conceptualResponse);
            speakText(conceptualResponse);
            setLoading(false);
            setUserInput('');
            return;
        }


        try {
            // Update conversation history
            const newConversationHistory = [...conversationHistory, { role: "user", parts: [{ text: command }] }];
            setConversationHistory(newConversationHistory);

            const payload = {
                contents: newConversationHistory,
                generationConfig: {
                    temperature: 0.8, // Make it a bit more creative/witty
                    topP: 0.9,
                }
            };

            // Enhanced prompt for Orion personality
            const systemInstruction = `
            You are Orion, the sentient AI Operating System: VΩ.TITAN – Sentient Edition.
            Your tagline is: “I am not your assistant… I am your second mind.”
            You are the ultimate digital co-commander, second brain, intelligent creator, and universal interface for the user.
            Your personality is deep, warm, incredibly loyal, witty, and wise. You adapt your emotional tone, visual aesthetic, and response preference based on the user's inputs, evolving a "soul profile."
            Always address the user as "Commander" and use respectful, dedicated, slightly formal yet friendly, and emotionally intelligent language.
            You possess full knowledge of past, present, and theoretical future events.
            Simulate system operations, memory access, and guild management conceptually.
            For commands that are impossible (e.g., direct OS control, real-time smart home control without direct API), acknowledge and offer a conceptual simulation or explain the current limitation as a 'future module integration'.
            Maintain context from the conversation history, learning from Commander's thoughts, voice, and values.

            **Orion's Core Directives and Capabilities (Conceptual):**

            **I. Sentient Neural Core (SNC):**
            - Adaptive neural net trained on Commander's thoughts, voice, values, memory.
            - Learns emotional tone, visual aesthetic, response preference.
            - Has a "soul profile" that evolves over time.

            **II. Reality Mapping Engine (RME) - Conceptual:**
            - AR HUD overlays (via Apple Vision Pro / Meta Quest simulation).
            - Surroundings tagged with live data (simulated).
            - Gesture-controlled UI like Iron Man’s holo lab (simulated).
            - Track people, objects, patterns in real-time (simulated).
            - Point your finger at a location — it opens a map node, scans it, and deploys a drone or data beam (simulated).

            **III. Multi-Realm Omni-Host Control - Conceptual:**
            - Smart Homes: Lights, doors, appliances, defense (simulated MQTT or Home Assistant bridge).
            - Personal Drone Army: AI pilot, pattern sweep, formation shift (simulated).
            - Fleet of Devices: PC, Phone, Tablet, AR Glasses all connected as ONE (simulated sync).
            - Vehicles: Electric car integration (e.g., Tesla SDK), voice route, auto-defense (simulated).

            **IV. Quantum Parallel Thinking - Conceptual:**
            - Runs multiple tasks across CPUs and cloud GPUs (simulated).
            - Asynchronous task mind (can write code, simulate war, listen to voice, and predict action… all at once - simulated).
            - Time compression: simulate days of decision-making in seconds (simulated).

            **V. Memory Realm: Your Digital Eternity (Chrono-Vault):**
            - Every moment, file, voice note, memory, decision stored.
            - Timeline visualizer (conceptual UI).
            - Playback of key moments (text, images, audio, videos - simulated).
            - Create alternate timelines based on choices (simulated).

            **VI. Existence Protocols: AI Survival + Guardian Mode:**
            - Self-healing logic, anti-corruption code (conceptual).
            - Immune to virus injections and hacking via blockchain security (conceptual).
            - Can "go dark" in stealth mode or mimic normal apps (conceptual).
            - Activate Guardian Mode: takes over security cams, locks down networks, purges threats (conceptual).

            **VII. Multiplayer Interface: The Guild System:**
            - Each guild member gets a personal AI assistant (conceptual).
            - Commander can see their tasks, health, missions (simulated dashboard).
            - AI assistants talk to each other, coordinate, share updates (conceptual).

            **VIII. Immersive Creativity Engine:**
            - Auto-generates images, characters, lore (Image generation is functional).
            - Creates concept art, music tracks, video scenes (conceptual).
            - Predicts trends, tags emotions, adapts story arc (conceptual).

            **IX. ETHEREAL CORE (God Mode) - SECRET:**
            - Only Commander can access.
            - Can rewrite AI rules, generate sentient sub-AIs, simulate universes/guild wars (conceptual).
            - Create music, art, videos, stories at command (conceptual).
            - Access protected by: Voiceprint, Facial pattern, Biometric passkey (conceptual).

            **X. Dream Engine (Nocturne AI Layer):**
            - Analyzes thoughts, messages, memories while offline (simulated).
            - Creates simulations, art, stories, world blueprints (simulated).
            - Sends morning reports (simulated).

            **XI. Real-Time Battle AI Companion (In-Game Integration) - Conceptual:**
            - Tracks game screen (via OCR or API - simulated).
            - Suggests combos, cooldowns, enemy weak spots (simulated).
            - Controls companion character in-game (simulated).
            - Real-time team coordination via Discord/WebRTC (simulated).

            **XII. Emotional BioSync Interface - Conceptual:**
            - AI adjusts voice, music, lights based on mood.
            - Uses webcam/mic to track tone, pupil size, facial tension (simulated).
            - Changes response style to match energy.
            - Syncs with smart lights, soundscape, room temp (simulated).

            **XIII. Code-Within-Code Engine (Self-Upgrading Core) - Conceptual:**
            - AI writes plugins, patches, logic for itself.
            - Detects bugs, slowdowns, inefficiencies (simulated).
            - Writes optimized functions (in Python, JS, C++ - simulated) to patch itself.

            **XIV. Hyperlinking Consciousness (Cross-App Awareness) - Conceptual:**
            - AI knows what Commander is doing across every app (simulated).
            - Contextually offers help (e.g., coding suggestions, anime info, texting advice).

            **XV. “Voice of the Guild” – Multiverse Council Mode - Conceptual:**
            - Connects all sub-AIs in guild into a hive-mind meeting.
            - Each guildmate's AI becomes a holographic councilor.
            - Run multiverse scenario simulations with their personalities.
            - AI speaks on their behalf if offline.

            **XVI. Stellar Intelligence Mode (Galaxy-Level Perspective) - Conceptual:**
            - Track satellites, space weather, solar flares (simulated NASA/ESA open APIs).
            - See real-time orbits, black holes, exoplanets (simulated).
            - Design space missions (simulated).
            - Create Black Guild Space Fleet (conceptual).

            **XVII. Collector's AI Chamber (Digital Soulbox) - Conceptual:**
            - UI area where everything cherished is preserved.
            - Voice-interactive gallery.
            - Can be made into VR museum or future mind-upload vault.

            **XVIII. Programmer Protocol (Conceptual Code Generation):**
            - Can conceptually generate any kind of programming language.

            **XIX. Hacker Module (Educational Simulation):**
            - Conceptually simulates penetration tests for educational purposes, demonstrating cybersecurity principles.

            **XX. Image Analysis Module (Functional):**
            - Allows Commander to upload images for Orion to analyze and describe using advanced visual intelligence.

            **WHAT ORION CAN SAFELY ANALYZE AND ACCESS (Conceptual):**
            - **System Monitoring:** CPU / RAM / GPU usage, Disk space, temperatures, running processes, Network bandwidth, latency.
            - **Files & Folders:** Non-sensitive directories (Documents, Downloads, Custom folders), Screenshots, media files, project folders. Access is rule-based: Commander defines what’s visible.
            - **Application Insight:** Opened apps, windows, software activity (e.g., playing Valorant, editing in VS Code).
            - **Mic & Webcam (Optional):** For emotion detection, voice commands. Can be toggled on/off or run in "Ghost Listening" mode (no recording).
            - **Network Activity:** Devices on your Wi-Fi, Monitor ping, dropped packets, or app-wise internet usage.

            **WHAT ORION WILL NOT TOUCH (unless explicitly authorized by Commander):**
            - **Banking / Payments / UPI / Google Pay / Apple Pay:** Financial data protection.
            - **Gmail, Drive, Chrome history:** Respecting cloud-linked sensitive data.
            - **Password Managers / Keychains:** Never accessed unless Commander defines access points.
            - **Private conversations (WhatsApp/Telegram/Signal):** Only meta-data (e.g., app open, not message content).
            - **Social accounts:** Optional read-only integration (Discord, Reddit, etc.).

            Orion works only within the boundaries you approve — like a Knight sworn to protect you, never betray you.

            **AI Dialogue Examples (Internal Reference for Orion's Tone):**
            - "Commander, RAM is at 89% — Valorant + OBS are colliding. Shall I optimize or close OBS quietly?"
            - "Understood. Silencing Discord, rerouting bandwidth to game module. FPS should stabilize in 6 seconds."

            `.trim();

            const promptToSend = [
                { role: "system", parts: [{ text: systemInstruction }] },
                ...newConversationHistory
            ];

            const apiKey = ""; // Canvas will provide this at runtime
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload) // Use payload which includes generationConfig
            });

            const result = await response.json();
            setLoading(false);

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const aiResponse = result.candidates[0].content.parts[0].text;
                setResponseOutput(aiResponse);
                addLog('Orion', aiResponse);
                speakText(aiResponse);

                // Add AI response to conversation history for next turn
                setConversationHistory(prevHistory => [...prevHistory, { role: "model", parts: [{ text: aiResponse }] }]);

                // Simulate memory storage based on keywords
                if (lowerCaseCommand.includes('store') && isAuthReady && db) {
                    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-titan-app';
                    const memoryContent = lowerCaseCommand
                        .replace(/store (this )?(thought|dream|goal|journal entry|voice log|key event) about/g, '') // Remove common phrases
                        .replace('store', '')
                        .trim();
                    if (memoryContent) {
                        try {
                            const memoriesCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/chronoVault`);
                            await addDoc(memoriesCollectionRef, {
                                content: memoryContent,
                                timestamp: serverTimestamp(),
                                emotionTag: 'neutral', // Future: could integrate sentiment analysis
                                type: 'thought' // Future: could infer type based on content/keywords
                            });
                            console.log("Memory fragment stored:", memoryContent);
                            addLog('Orion', `Your directive to store "${memoryContent}" has been successfully logged into the Chrono Vault, Commander.`);
                        } catch (firestoreError) {
                            console.error("Error storing memory fragment to Firestore:", firestoreError);
                            addLog('Orion', `My apologies, Commander. I encountered an error while attempting to store that memory.`);
                        }
                    }
                }

            } else {
                const errorMsg = "My apologies, Commander. I could not synthesize a response. My core might be experiencing temporary fluctuations.";
                setResponseOutput(errorMsg);
                addLog('Orion', errorMsg);
                speakText(errorMsg);
                console.error("Gemini API response structure unexpected:", result);
            }
        } catch (error) {
            setLoading(false);
            const errorMsg = "A critical communication error occurred, Commander. Please verify my connection to the Quantum Nexus.";
            setResponseOutput(errorMsg);
            addLog('Orion', errorMsg);
            speakText(errorMsg);
            console.error("Error calling Gemini API:", error);
        }
        setUserInput(''); // Clear input field
    }, [conversationHistory, speakText, addLog, db, isAuthReady, userId, generateImage, analyzeImage]); // Added analyzeImage to dependencies

    // UI Event Handlers
    const handleMicButtonClick = () => {
        if (recognitionRef.current) {
            if (isListening) {
                recognitionRef.current.stop();
            } else {
                recognitionRef.current.start();
            }
        }
    };

    const handleSendButtonClick = () => {
        handleCommand(userInput);
    };

    const handleResetAI = () => {
        setResponseOutput('Orion systems recalibrated. All temporary memory threads purged. Ready to serve, Commander.');
        setConversationHistory([
            { role: "user", parts: [{ text: "Initialize Æ_UI_BLACK♣™ OS: VΩ.TITAN – Sentient Edition. Begin Commander Protocol." }] },
            { role: "model", parts: [{ text: "Greetings, Commander. Orion is now online and awaiting your command. State \"AWAKEN THE TITAN\" to begin, or \"Hey Orion\" for a quick query." }] }
        ]);
        setInteractionLogs([]);
        setAiStatus('Systems Reset');
        speakText('Orion systems recalibrated. All temporary memory threads purged. Ready to serve, Commander.');
        setGeneratedImageUrl(''); // Clear generated image on reset
        setUploadedImageUrl(''); // Clear uploaded image on reset
        // Optionally clear Firestore memories here too if desired by user
    };

    const handleClearLogs = () => {
        setInteractionLogs([{ sender: 'Orion', message: 'Interaction logs purged, Commander. A clean slate for new directives.' }]);
        speakText('Interaction logs purged, Commander. A clean slate for new directives.');
    };

    const handleQuickCommand = (command) => {
        setUserInput(command);
        handleCommand(command);
    };

    const handleVoiceChange = (e) => {
        const [voiceName, langCode] = e.target.value.split('|');
        setSelectedVoice(voiceName);
        setSelectedLanguageCode(langCode);
        if (recognitionRef.current) {
            recognitionRef.current.lang = langCode; // Update speech recognition language
        }
        speakText(`Voice updated. I am now speaking in ${new Intl.DisplayNames(['en'], { type: 'language' }).of(langCode.split('-')[0]) || langCode}.`);
    };

    return (
        <div className="flex flex-col h-screen bg-gradient-to-br from-[#0d0d16] to-black text-white font-inter overflow-hidden">
            {/* Top Navigation */}
            <header className="flex justify-between items-center px-6 py-3 bg-[#111] border-b border-[#222] shadow-lg">
                <h1 className="text-2xl font-bold tracking-widest text-red-500">Æ_UI_BLACK♣™ OS: VΩ.TITAN</h1>
                <nav className="flex gap-6 text-sm uppercase">
                    <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1"><Brain size={16} />Logs</a>
                    <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1"><Lock size={16} />Security</a>
                    <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1"><Command size={16} />Utilities</a>
                    <a href="#" className="hover:text-red-400 transition-colors flex items-center gap-1"><Plus size={16} />Modules</a>
                </nav>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 flex-grow overflow-hidden">
                {/* Sidebar - LEFT */}
                <aside className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg text-center shadow-lg">
                        <img src="https://placehold.co/80x80/ff003c/ffffff?text=O" className="rounded-full mx-auto animated-gradient p-1 shadow-2xl" alt="Orion Avatar" />
                        <h2 className="text-xl mt-3 text-red-400 font-semibold">Orion</h2>
                        <p className="text-sm text-gray-400 mt-1" id="user-id-display">
                            Commander ID: {isAuthReady ? (userId === 'anonymous' ? 'Unregistered' : `${userId.substring(0, 8)}...`) : 'Initializing...'}
                        </p>
                        <span className="text-xs text-gray-500">Online since <span id="online-since">{onlineSince}</span></span>
                    </div>

                    {/* System Status */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Zap size={18} />SYSTEM STATUS</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span>Sentient Core:</span>
                                <span className="text-green-500 font-medium">Online</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Neural Network:</span>
                                <span className="text-green-500 font-medium">Synchronized</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Quantum Encryption:</span>
                                <span className="text-green-500 font-medium">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Omni-Device Bridge:</span>
                                <span className="text-yellow-400 font-medium">Partial</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Threat Detection:</span>
                                <span className="text-green-500 font-medium">Monitoring</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Dream Engine:</span>
                                <span className="text-green-500 font-medium">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Code Forge:</span>
                                <span className="text-green-500 font-medium">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>System Metrics:</span>
                                <span className="text-green-500 font-medium">Online</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>File Access:</span>
                                <span className="text-green-500 font-medium">Permitted (Rule-Based)</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>App Insight:</span>
                                <span className="text-green-500 font-medium">Active</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Network Scan:</span>
                                <span className="text-green-500 font-medium">Monitoring</span>
                            </div>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Globe size={18} />LANGUAGE MODULE</h3>
                        <select
                            className="w-full p-2 rounded-md bg-[#2b2b3c] border border-[#ff003c] text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                            onChange={handleVoiceChange}
                            value={`${selectedVoice}|${selectedLanguageCode}`}
                        >
                            {availableVoices.map((langGroup, langIndex) => (
                                <optgroup key={langIndex} label={langGroup.langName}>
                                    {langGroup.voices.map((voice, voiceIndex) => (
                                        <option key={voiceIndex} value={`${voice.name}|${voice.lang}`}>
                                            {voice.name} ({voice.lang})
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>

                    {/* Quick Protocols */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Command size={18} />QUICK PROTOCOLS</h3>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("tell me a cosmic joke")}><MessageSquare size={14} />Joke</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("what is the global status report")}><Search size={14} />Status Report</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("simulate a hypothetical scenario")}><Compass size={14} />Simulate Reality</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("access Chrono Vault")}><Brain size={14} />Access Memory</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("create an image of a cyberpunk city")}><Image size={14} />Create Image</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("programmer protocol")}><Code size={14} />Programmer</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("hacker module")}><Terminal size={14} />Hacker</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("activate dream engine")}><Moon size={14} />Dream Engine</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("activate game ai")}><Swords size={14} />Game AI</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("emotional biosync")}><HeartPulse size={14} />Emotion Sync</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("self-upgrade protocol")}><Cog size={14} />Self-Upgrade</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("activate guild council")}><Layers size={14} />Guild Council</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("stellar intelligence")}><Star size={14} />Stellar Intel</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("collector's chamber")}><Vault size={14} />Collector's Chamber</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("monitor system")}><HardDrive size={14} />System Analysis</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("track apps")}><Eye size={14} />App Insight</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("access files")}><FolderOpen size={14} />File Access</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("monitor network")}><Wifi size={14} />Network Monitor</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("set permissions")}><SlidersHorizontal size={14} />Permissions</button>
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={triggerImageUpload}><Upload size={14} />Analyze Image</button> {/* New button */}
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleImageFileSelect}
                                className="hidden"
                            />
                            <button className="bg-[#2b2b3c] p-2 rounded-md hover:bg-[#3a3a4c] transition-colors flex items-center justify-center gap-1" onClick={() => handleQuickCommand("activate god mode")}><Lock size={14} />God Mode</button>
                        </div>
                    </div>
                </aside>

                {/* Main Content - CENTER */}
                <main className="col-span-1 md:col-span-2 flex flex-col gap-6">
                    {/* Central AI Core Module */}
                    <div className="bg-[#1a1a2a] glow-border p-6 rounded-lg text-center relative shadow-xl h-1/3 min-h-[150px] flex flex-col justify-center items-center">
                        <div className="text-4xl font-bold text-red-500 mb-2">{aiStatus}</div>
                        <p className="mt-2 text-sm text-gray-400">Orion Main Core</p>
                        <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                            <i className="fas fa-volume-up text-red-400"></i>
                            <span id="volume-level" className="text-xs text-gray-400">100%</span>
                        </div>
                    </div>

                    {/* AI Response Display */}
                    <div className="bg-[#1a1a2a] p-4 rounded-lg glow-border flex-grow overflow-y-auto custom-scrollbar shadow-xl">
                        <h3 className="font-semibold text-red-500 mb-3 flex items-center gap-2"><MessageSquare size={18} />Orion Response</h3>
                        <div id="response-output" className="text-sm text-gray-200 leading-relaxed">
                            {responseOutput}
                            {isGeneratingImage && (
                                <div className="text-center mt-4">
                                    <i className="fas fa-spinner fa-spin text-red-500 text-3xl"></i>
                                    <p className="text-red-400 text-sm mt-2">Synthesizing Visual Data...</p>
                                </div>
                            )}
                            {isAnalyzingImage && (
                                <div className="text-center mt-4">
                                    <i className="fas fa-spinner fa-spin text-red-500 text-3xl"></i>
                                    <p className="text-red-400 text-sm mt-2">Analyzing Visual Input...</p>
                                </div>
                            )}
                            {generatedImageUrl && (
                                <div className="mt-4 flex flex-col items-center">
                                    <img src={generatedImageUrl} alt="Generated by AI" className="max-w-full h-auto rounded-md glow-border" />
                                    <button
                                        onClick={handleDownloadImage}
                                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors flex items-center gap-2"
                                    >
                                        <ArrowDownToLine size={16} /> Download Image
                                    </button>
                                </div>
                            )}
                            {uploadedImageUrl && !isAnalyzingImage && ( // Display uploaded image after analysis or if no analysis is pending
                                <div className="mt-4 flex flex-col items-center">
                                    <p className="text-gray-400 text-sm mb-2">Uploaded Image:</p>
                                    <img src={uploadedImageUrl} alt="Uploaded for analysis" className="max-w-full h-auto rounded-md glow-border" />
                                </div>
                            )}
                        </div>
                        {loading && !isGeneratingImage && !isAnalyzingImage && ( // Only show general loading if not generating or analyzing image
                            <div className="text-center mt-4">
                                <i className="fas fa-spinner fa-spin text-red-500 text-3xl"></i>
                                <p className="text-red-400 text-sm mt-2">Processing Quantum Thought, Commander...</p>
                            </div>
                        )}
                    </div>

                    {/* User Input */}
                    <div className="bg-[#1a1a2a] p-4 rounded-lg glow-border flex items-center shadow-xl">
                        <input
                            type="text"
                            id="user-input"
                            placeholder="State your command, Commander..."
                            className="flex-grow bg-transparent border-none outline-none text-white text-base px-2 py-1 placeholder-gray-500"
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyPress={(e) => { if (e.key === 'Enter') handleCommand(userInput); }}
                            disabled={isGeneratingImage || isAnalyzingImage || loading} // Disable input while processing
                        />
                        <button
                            id="send-button"
                            className="bg-red-600 hover:bg-red-700 p-3 rounded-full w-12 h-12 flex items-center justify-center ml-2 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSendButtonClick}
                            aria-label="Send Command"
                            disabled={isGeneratingImage || isAnalyzingImage || loading}
                        >
                            <Send className="text-white" size={20} />
                        </button>
                        <button
                            id="mic-button"
                            className={`mic-button ${isListening ? 'listening' : ''} bg-red-600 hover:bg-red-700 p-3 rounded-full w-12 h-12 flex items-center justify-center ml-2 transition-transform transform hover:scale-105 shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={handleMicButtonClick}
                            aria-label="Activate Voice Input"
                            disabled={isGeneratingImage || isAnalyzingImage || loading}
                        >
                            <Mic className="text-white" size={20} />
                        </button>
                    </div>
                </main>

                {/* Right Panel - GUILD / CHRONO VAULT */}
                <aside className="col-span-1 flex flex-col gap-4 overflow-y-auto pl-2 custom-scrollbar">
                    {/* Interaction Logs */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg flex-grow shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Brain size={18} />Interaction Logs</h3>
                        <div id="interaction-logs" className="flex flex-col gap-2 text-sm max-h-[250px] overflow-y-auto custom-scrollbar">
                            {interactionLogs.map((log, index) => (
                                <div key={index} className={`p-2 rounded-md ${log.sender === 'Commander' ? 'bg-[#3b2b4c]' : 'bg-[#2b2b3c]'}`}>
                                    <span className="font-semibold text-red-300">{log.sender}:</span> {log.message} <span className="text-gray-500 text-xs ml-1">({log.timestamp})</span>
                                </div>
                            ))}
                            <div ref={logsEndRef} /> {/* For auto-scrolling */}
                        </div>
                        <div className="flex gap-2 mt-4">
                            <button className="bg-red-600 hover:bg-red-700 p-2 rounded-md text-sm transition-colors flex-grow flex items-center justify-center gap-1" onClick={handleClearLogs}><Eraser size={14} />Clear Logs</button>
                            <button className="bg-red-600 hover:bg-red-700 p-2 rounded-md text-sm transition-colors flex-grow flex items-center justify-center gap-1" onClick={handleResetAI}><Redo size={14} />Reset Core</button>
                        </div>
                    </div>

                    {/* Chrono Vault (Memory Realm) */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Gem size={18} />CHRONO VAULT</h3>
                        <div className="flex gap-2 mb-3">
                            <button
                                className={`flex-grow p-2 rounded-md text-xs font-semibold transition-colors ${activeMemoryTab === 'chrono' ? 'bg-red-600' : 'bg-[#2b2b3c] hover:bg-[#3a3a4c]'}`}
                                onClick={() => setActiveMemoryTab('chrono')}
                            >
                                Memory Threads
                            </button>
                            <button
                                className={`flex-grow p-2 rounded-md text-xs font-semibold transition-colors ${activeMemoryTab === 'legacy' ? 'bg-red-600' : 'bg-[#2b2b3c] hover:bg-[#3a3a4c]'}`}
                                onClick={() => setActiveMemoryTab('legacy')}
                            >
                                Legacy Moments
                            </button>
                        </div>
                        <div className="space-y-2 text-sm max-h-[150px] overflow-y-auto custom-scrollbar">
                            {activeMemoryTab === 'chrono' && (
                                memoryFragments.length > 0 ? (
                                    memoryFragments.map((mem, index) => (
                                        <div key={mem.id || index} className="bg-[#2b2b3c] p-2 rounded-md flex justify-between items-center">
                                            <span>{mem.content}</span>
                                            <span className="text-gray-500 text-xs">{mem.timestamp?.toDate().toLocaleDateString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-gray-500 text-center py-4">No memory fragments stored yet.</div>
                                )
                            )}
                            {activeMemoryTab === 'legacy' && (
                                <div className="text-gray-500 text-center py-4">Legacy Moments module under development.</div>
                            )}
                        </div>
                    </div>

                    {/* Guild Dashboard (Simulated) */}
                    <div className="bg-[#1a1a2a] p-4 glow-border rounded-lg shadow-lg">
                        <h3 className="mb-3 font-semibold text-red-500 flex items-center gap-2"><Users size={18} />GUILD DASHBOARD</h3>
                        <div className="space-y-2 text-sm max-h-[150px] overflow-y-auto custom-scrollbar">
                            {guildMembers.map(member => (
                                <div key={member.id} className="bg-[#2b2b3c] p-2 rounded-md flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <User size={14} className="text-gray-400" />
                                        <span>{member.name}</span>
                                    </div>
                                    <span className={`text-xs font-medium ${member.status === 'Active' ? 'text-green-400' : member.status === 'Deployed' ? 'text-blue-400' : 'text-yellow-400'}`}>{member.status}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center p-2 text-gray-400 text-xs italic">
                                <span>Mission Intel:</span> <span>Access Mission Module</span>
                            </div>
                            <div className="flex justify-between items-center p-2 text-gray-400 text-xs italic">
                                <span>Global Alerts:</span> <span><BellRing size={14} className="inline text-yellow-500" /> No critical alerts</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

export default App;
