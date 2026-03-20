import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  isRead?: boolean;
  isDeleted?: boolean;
  imageUrl?: string;
}

interface ChatState {
  conversations: any[];
  activeConversation: any | null;
  messages: Message[];
  isLoading: boolean;
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: [],
  isLoading: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<any[]>) => {
      state.conversations = action.payload;
    },
    setActiveConversation: (state, action: PayloadAction<any | null>) => {
      state.activeConversation = action.payload;
      state.messages = []; // Clear messages when switching conversations
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      if (
        state.activeConversation &&
        (state.activeConversation.id === action.payload.senderId ||
         state.activeConversation.id === action.payload.receiverId)
      ) {
        // Prevent duplication if the message is already optimistically added
        const exists = state.messages.some(msg => msg.id === action.payload.id);
        if (!exists) {
          state.messages.push(action.payload);
        }
      }
      // Update the constant conversation to show latest message
      const convIndex = state.conversations.findIndex(
        c => c.id === action.payload.senderId || c.id === action.payload.receiverId
      );
      if (convIndex > -1) {
        state.conversations[convIndex].lastMessage = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    clearMessages: (state, action: PayloadAction<string>) => {
      if (state.activeConversation && state.activeConversation.id === action.payload) {
        state.messages = [];
      }
      const convIndex = state.conversations.findIndex(c => c.id === action.payload);
      if (convIndex > -1) {
        state.conversations[convIndex].lastMessage = null;
      }
    },
    markMessagesAsReadRedux: (state, action: PayloadAction<{senderId: string, readerId: string}>) => {
      state.messages.forEach(msg => {
        if (msg.senderId === action.payload.senderId && msg.receiverId === action.payload.readerId) {
          msg.isRead = true;
        }
      });
    },
    updateUserPresence: (state, action: PayloadAction<{id: string, isOnline: boolean, lastSeen?: string}>) => {
      const conv = state.conversations.find(c => c.id === action.payload.id);
      if (conv) {
        conv.isOnline = action.payload.isOnline;
        if (action.payload.lastSeen) conv.lastSeen = action.payload.lastSeen;
      }
      if (state.activeConversation && state.activeConversation.id === action.payload.id) {
        state.activeConversation.isOnline = action.payload.isOnline;
        if (action.payload.lastSeen) state.activeConversation.lastSeen = action.payload.lastSeen;
      }
    },
    updateUserProfile: (state, action: PayloadAction<{id: string, name?: string, image?: string, about?: string}>) => {
      const { id, name, image, about } = action.payload;
      const conv = state.conversations.find(c => c.id === id);
      if (conv) {
        if (name) conv.name = name;
        if (image) conv.image = image;
        if (about) conv.about = about;
      }
      if (state.activeConversation && state.activeConversation.id === id) {
        if (name) state.activeConversation.name = name;
        if (image) state.activeConversation.image = image;
        if (about) state.activeConversation.about = about;
      }
    },
    resetChat: (state) => {
      state.activeConversation = null;
      state.conversations = [];
      state.messages = [];
    },
    removeConversationRedux: (state, action: PayloadAction<string>) => {
      state.conversations = state.conversations.filter(c => c.id !== action.payload);
      if (state.activeConversation?.id === action.payload) {
        state.activeConversation = null;
        state.messages = [];
      }
    },
    deleteMessageRedux: (state, action: PayloadAction<{id: string, type: "everyone" | "me"}>) => {
      const { id: msgId, type } = action.payload;
      
      if (type === "me") {
        state.messages = state.messages.filter(m => m.id !== msgId);
      } else {
        const msg = state.messages.find(m => m.id === msgId);
        if (msg) {
          msg.isDeleted = true;
          msg.content = "";
        }
      }

      state.conversations.forEach(c => {
         if (c.lastMessage && c.lastMessage.id === msgId) {
             c.lastMessage.isDeleted = true;
             c.lastMessage.content = "";
         }
      });
    },
  },
});

export const { setConversations, setActiveConversation, setMessages, addMessage, setLoading, clearMessages, markMessagesAsReadRedux, updateUserPresence, updateUserProfile, deleteMessageRedux, resetChat, removeConversationRedux } = chatSlice.actions;
export default chatSlice.reducer;
