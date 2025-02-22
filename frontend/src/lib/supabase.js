import { supabase } from '../supabaseClient';

// Helper function to get current user
const getCurrentUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
};

// Profile functions
export const getProfile = async (userId) => {
  console.log('Fetching profile for user ID:', userId); // Debug log
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error); // Debug log
    // If no profile exists, create one
    if (error.code === 'PGRST116') {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const newProfile = {
          id: userId,
          username: `user_${userId.slice(0, 8)}`,
          full_name: '',
          bio: '',
          avatar_url: ''
        };
        
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (createError) throw createError;
        return createdProfile;
      }
    }
    throw error;
  }
  return data;
};

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) throw error;
  return data;
};

// Friend functions
export const searchUsers = async (query) => {
  const { data, error } = await supabase
    .rpc('search_users', { search_query: query });

  if (error) throw error;
  return data;
};

export const getFriends = async () => {
  const { data, error } = await supabase
    .from('user_friends')
    .select('*')
    .order('username');

  if (error) throw error;
  return data;
};

export const sendFriendRequest = async (receiverId) => {
  const senderId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('friend_requests')
    .insert([{ sender_id: senderId, receiver_id: receiverId }]);

  if (error) throw error;
  return data;
};

export const getPendingFriendRequests = async () => {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      sender:sender_id(id, username, avatar_url),
      created_at
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const respondToFriendRequest = async (requestId, accept) => {
  const { data: request, error: fetchError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .single();

  if (fetchError) throw fetchError;

  // Start a transaction
  if (accept) {
    // Create friendship
    const { error: friendshipError } = await supabase
      .from('friendships')
      .insert([{
        user_id: request.receiver_id,
        friend_id: request.sender_id
      }]);

    if (friendshipError) throw friendshipError;
  }

  // Update request status
  const { error: updateError } = await supabase
    .from('friend_requests')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', requestId);

  if (updateError) throw updateError;
};

// Message functions
export const sendMessage = async (receiverId, content) => {
  const { data, error } = await supabase
    .from('messages')
    .insert([{ receiver_id: receiverId, content }]);

  if (error) throw error;
  return data;
};

export const getMessages = async (otherUserId) => {
  const userId = await getCurrentUserId();
  
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      sender:sender_id(id, username, avatar_url),
      receiver:receiver_id(id, username, avatar_url)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

// Subscribe to new messages
export const subscribeToMessages = async (callback) => {
  const userId = await getCurrentUserId();
  
  return supabase
    .from('messages')
    .on('INSERT', (payload) => {
      if (payload.new.receiver_id === userId) {
        callback(payload.new);
      }
    })
    .subscribe();
}; 