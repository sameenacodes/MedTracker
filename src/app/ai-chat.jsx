import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { getData } from "../services/storage";


// ======================================================
// API URL
// ======================================================

const BASE_URL =
  Platform.OS === "web"
    ? "https://medtracker-1.onrender.com/api"
    : "https://medtracker-1.onrender.com/api";


// ======================================================
// COMPONENT
// ======================================================

export default function AIChat() {

  const router = useRouter();


  // ====================================================
  // MESSAGES
  // ====================================================

  const [messages, setMessages] = useState([
    {
      id: "1",
      type: "bot",

      text:
        "Hi! I'm your MedTracker AI Assistant 👋\n\n" +
        "I can help you check medicine stock, expiry dates, " +
        "sales and reorder suggestions.",
    },
  ]);


  // ====================================================
  // INPUT
  // ====================================================

  const [input, setInput] = useState("");


  // ====================================================
  // LOADING
  // ====================================================

  const [loading, setLoading] = useState(false);


  // ====================================================
  // QUICK QUESTIONS
  // ====================================================

  const suggestions = [
    "What are today's sales?",
    "What expires today?",
    "Show low stock medicines",
    "What should I reorder?",
    "Which medicines expire this week?",
  ];


  // ====================================================
  // SEND MESSAGE
  // ====================================================

  const sendMessage = async (
    customMessage = null
  ) => {

    const userMessage =
      (
        customMessage !== null
          ? customMessage
          : input
      )
        .trim();


    // Empty message
    if (!userMessage) {
      return;
    }


    // Prevent multiple requests
    if (loading) {
      return;
    }


    // Clear input
    setInput("");


    // ==================================================
    // USER MESSAGE
    // ==================================================

    const userMsg = {
      id:
        `user-${Date.now()}`,

      type:
        "user",

      text:
        userMessage,
    };


    setMessages(
      (prev) => [
        ...prev,
        userMsg,
      ]
    );


    setLoading(true);


    try {

      // =================================================
      // GET LOGIN TOKEN
      // =================================================

      const token =
        await getData("token");


      if (!token) {

        const loginMessage = {
          id:
            `error-${Date.now()}`,

          type:
            "bot",

          text:
            "Your login session has expired. Please login again and try.",
        };


        setMessages(
          (prev) => [
            ...prev,
            loginMessage,
          ]
        );


        setLoading(false);

        return;
      }


      // =================================================
      // API REQUEST
      // =================================================

      const response =
        await fetch(
          `${BASE_URL}/ai-chat`,
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body:
              JSON.stringify({
                message:
                  userMessage,
              }),
          }
        );


      // =================================================
      // RESPONSE
      // =================================================

      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.reply ||
          data.message ||
          "AI request failed"
        );
      }


      // =================================================
      // BOT MESSAGE
      // =================================================

      const botMsg = {
        id:
          `bot-${Date.now()}`,

        type:
          "bot",

        text:
          data.reply ||
          "Sorry, I couldn't understand that request.",
      };


      setMessages(
        (prev) => [
          ...prev,
          botMsg,
        ]
      );


    } catch (error) {

      console.log(
        "AI Chat Error:",
        error
      );


      // =================================================
      // ERROR MESSAGE
      // =================================================

      const errorMsg = {
        id:
          `error-${Date.now()}`,

        type:
          "bot",

        text:
          "Unable to connect to MedTracker server.\n\n" +
          "Please check that:\n" +
          "• Backend is running\n" +
          "• Phone and laptop are on the same Wi-Fi\n" +
          "• API IP address is correct",
      };


      setMessages(
        (prev) => [
          ...prev,
          errorMsg,
        ]
      );

    } finally {

      setLoading(false);

    }

  };


  // ====================================================
  // RENDER MESSAGE
  // ====================================================

  const renderMessage =
    ({ item }) => {

      const isUser =
        item.type === "user";


      return (
        <View
          style={[
            styles.messageRow,

            isUser &&
              styles.userMessageRow,
          ]}
        >

          {/* BOT ICON */}

          {!isUser && (
            <View
              style={styles.botIcon}
            >
              <Ionicons
                name="sparkles"
                size={18}
                color="#176B52"
              />
            </View>
          )}


          {/* MESSAGE */}

          <View
            style={[
              styles.messageBubble,

              isUser
                ? styles.userBubble
                : styles.botBubble,
            ]}
          >

            <Text
              style={[
                styles.messageText,

                isUser &&
                  styles.userMessageText,
              ]}
            >
              {item.text}
            </Text>

          </View>

        </View>
      );

    };


  // ====================================================
  // MAIN UI
  // ====================================================

  return (

    <KeyboardAvoidingView
      style={styles.container}

      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
    >

      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={styles.header}
      >

        {/* BACK */}

        <TouchableOpacity
          style={styles.backButton}

          onPress={() =>
            router.back()
          }

          activeOpacity={0.7}
        >

          <Ionicons
            name="arrow-back"
            size={22}
            color="#17201C"
          />

        </TouchableOpacity>


        {/* AI ICON */}

        <View
          style={styles.headerIcon}
        >

          <Ionicons
            name="sparkles"
            size={22}
            color="#176B52"
          />

        </View>


        {/* HEADER TEXT */}

        <View
          style={
            styles.headerTextContainer
          }
        >

          <Text
            style={styles.headerTitle}
          >
            AI Pharmacy Assistant
          </Text>


          <View
            style={styles.onlineRow}
          >

            <View
              style={styles.onlineDot}
            />

            <Text
              style={styles.onlineText}
            >
              Connected to inventory
            </Text>

          </View>

        </View>

      </View>


      {/* =================================================
          QUICK SUGGESTIONS
      ================================================= */}

      {messages.length <= 1 && (

        <View
          style={
            styles.suggestionsContainer
          }
        >

          <Text
            style={
              styles.suggestionTitle
            }
          >
            Try asking
          </Text>


          <FlatList
            data={suggestions}

            horizontal

            showsHorizontalScrollIndicator={
              false
            }

            keyExtractor={
              (item) => item
            }

            contentContainerStyle={{
              paddingHorizontal: 18,
            }}

            renderItem={({
              item,
            }) => (

              <TouchableOpacity
                style={
                  styles.suggestionChip
                }

                onPress={() =>
                  sendMessage(item)
                }

                activeOpacity={0.75}
              >

                <Text
                  style={
                    styles.suggestionText
                  }
                >
                  {item}
                </Text>

              </TouchableOpacity>

            )}
          />

        </View>

      )}


      {/* =================================================
          CHAT
      ================================================= */}

      <FlatList
        data={messages}

        renderItem={renderMessage}

        keyExtractor={
          (item) => item.id
        }

        contentContainerStyle={
          styles.chatContent
        }

        showsVerticalScrollIndicator={
          false
        }

        keyboardShouldPersistTaps="handled"

        ListFooterComponent={

          loading ? (

            <View
              style={
                styles.typingContainer
              }
            >

              {/* BOT ICON */}

              <View
                style={styles.botIcon}
              >

                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#176B52"
                />

              </View>


              {/* LOADING */}

              <View
                style={
                  styles.typingBubble
                }
              >

                <ActivityIndicator
                  size="small"
                  color="#176B52"
                />

                <Text
                  style={
                    styles.typingText
                  }
                >
                  Checking pharmacy data...
                </Text>

              </View>

            </View>

          ) : null
        }
      />


      {/* =================================================
          INPUT AREA
      ================================================= */}

      <View
        style={styles.inputArea}
      >

        <View
          style={styles.inputWrapper}
        >

          {/* TEXT INPUT */}

          <TextInput
            value={input}

            onChangeText={setInput}

            placeholder="Ask about your pharmacy..."

            placeholderTextColor="#9AA49F"

            style={styles.input}

            multiline

            maxLength={500}

            editable={!loading}

            returnKeyType="send"

            onSubmitEditing={() =>
              sendMessage()
            }
          />


          {/* SEND BUTTON */}

          <TouchableOpacity
            style={[
              styles.sendButton,

              (
                !input.trim() ||
                loading
              ) &&
                styles.sendButtonDisabled,
            ]}

            onPress={() =>
              sendMessage()
            }

            disabled={
              !input.trim() ||
              loading
            }

            activeOpacity={0.8}
          >

            <Ionicons
              name="arrow-up"
              size={20}
              color="#FFFFFF"
            />

          </TouchableOpacity>

        </View>


        {/* DISCLAIMER */}

        <Text
          style={
            styles.disclaimer
          }
        >
          AI Assistant uses your MedTracker inventory data.
        </Text>

      </View>

    </KeyboardAvoidingView>

  );

}


// ======================================================
// STYLES
// ======================================================

const styles =
  StyleSheet.create({

    // ==================================================
    // CONTAINER
    // ==================================================

    container: {
      flex: 1,

      backgroundColor:
        "#F8FAF9",
    },


    // ==================================================
    // HEADER
    // ==================================================

    header: {
      flexDirection:
        "row",

      alignItems:
        "center",

      paddingHorizontal:
        18,

      paddingTop:
        Platform.OS === "ios"
          ? 55
          : 22,

      paddingBottom:
        16,

      backgroundColor:
        "#FFFFFF",

      borderBottomWidth:
        1,

      borderBottomColor:
        "#E7ECE9",
    },


    backButton: {
      width: 40,

      height: 40,

      borderRadius: 20,

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 10,
    },


    headerIcon: {
      width: 42,

      height: 42,

      borderRadius: 14,

      backgroundColor:
        "#E8F4EF",

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 11,
    },


    headerTextContainer: {
      flex: 1,
    },


    headerTitle: {
      fontSize: 17,

      fontWeight: "700",

      color:
        "#17201C",
    },


    onlineRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 3,
    },


    onlineDot: {
      width: 7,

      height: 7,

      borderRadius: 4,

      backgroundColor:
        "#176B52",

      marginRight: 6,
    },


    onlineText: {
      fontSize: 11,

      color:
        "#718078",
    },


    // ==================================================
    // SUGGESTIONS
    // ==================================================

    suggestionsContainer: {
      paddingTop: 18,

      paddingBottom: 8,
    },


    suggestionTitle: {
      fontSize: 13,

      fontWeight: "600",

      color:
        "#5E6964",

      marginHorizontal: 18,

      marginBottom: 10,
    },


    suggestionChip: {
      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#DCE5E0",

      paddingHorizontal: 14,

      paddingVertical: 10,

      borderRadius: 18,

      marginRight: 8,
    },


    suggestionText: {
      fontSize: 12,

      color:
        "#176B52",

      fontWeight: "600",
    },


    // ==================================================
    // CHAT
    // ==================================================

    chatContent: {
      paddingHorizontal: 16,

      paddingTop: 10,

      paddingBottom: 15,

      flexGrow: 1,
    },


    messageRow: {
      flexDirection:
        "row",

      alignItems:
        "flex-end",

      marginBottom: 14,
    },


    userMessageRow: {
      justifyContent:
        "flex-end",
    },


    botIcon: {
      width: 34,

      height: 34,

      borderRadius: 17,

      backgroundColor:
        "#E8F4EF",

      justifyContent:
        "center",

      alignItems:
        "center",

      marginRight: 8,
    },


    messageBubble: {
      maxWidth:
        "78%",

      paddingHorizontal:
        15,

      paddingVertical:
        12,

      borderRadius:
        17,
    },


    botBubble: {
      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#E1E8E4",

      borderBottomLeftRadius:
        5,
    },


    userBubble: {
      backgroundColor:
        "#176B52",

      borderBottomRightRadius:
        5,
    },


    messageText: {
      fontSize: 14,

      lineHeight: 21,

      color:
        "#26312C",
    },


    userMessageText: {
      color:
        "#FFFFFF",
    },


    // ==================================================
    // TYPING / LOADING
    // ==================================================

    typingContainer: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 12,
    },


    typingBubble: {
      flexDirection:
        "row",

      alignItems:
        "center",

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1,

      borderColor:
        "#E1E8E4",

      paddingHorizontal:
        14,

      paddingVertical:
        10,

      borderRadius:
        16,
    },


    typingText: {
      marginLeft: 8,

      fontSize: 12,

      color:
        "#68746E",
    },


    // ==================================================
    // INPUT
    // ==================================================

    inputArea: {
      backgroundColor:
        "#FFFFFF",

      borderTopWidth: 1,

      borderTopColor:
        "#E5EBE8",

      paddingHorizontal:
        15,

      paddingTop: 10,

      paddingBottom:
        Platform.OS === "ios"
          ? 24
          : 12,
    },


    inputWrapper: {
      flexDirection:
        "row",

      alignItems:
        "flex-end",

      backgroundColor:
        "#F4F7F5",

      borderWidth: 1,

      borderColor:
        "#DCE5E0",

      borderRadius: 24,

      paddingLeft: 16,

      paddingRight: 6,

      minHeight: 50,
    },


    input: {
      flex: 1,

      fontSize: 14,

      color:
        "#17201C",

      paddingVertical: 13,

      maxHeight: 100,
    },


    sendButton: {
      width: 40,

      height: 40,

      borderRadius: 20,

      backgroundColor:
        "#176B52",

      justifyContent:
        "center",

      alignItems:
        "center",

      marginBottom: 4,
    },


    sendButtonDisabled: {
      backgroundColor:
        "#A9B8B1",
    },


    // ==================================================
    // DISCLAIMER
    // ==================================================

    disclaimer: {
      textAlign:
        "center",

      fontSize: 10,

      color:
        "#98A39E",

      marginTop: 7,
    },

  });