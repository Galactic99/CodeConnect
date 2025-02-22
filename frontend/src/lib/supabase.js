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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      user_id,
      friend_id,
      profiles!friendships_friend_id_fkey (
        id,
        username,
        avatar_url
      )
    `)
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const sendFriendRequest = async (receiverId) => {
  const senderId = await getCurrentUserId();
  
  // First, check if a request already exists
  const { data: existingRequest, error: checkError } = await supabase
    .from('friend_requests')
    .select('*')
    .eq('sender_id', senderId)
    .eq('receiver_id', receiverId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    throw checkError;
  }

  // If request exists, throw a more user-friendly error
  if (existingRequest) {
    throw new Error('Friend request already sent');
  }

  // Also check if they're already friends
  const { data: existingFriendship, error: friendshipError } = await supabase
    .from('friendships')
    .select('*')
    .or(`and(user_id.eq.${senderId},friend_id.eq.${receiverId}),and(user_id.eq.${receiverId},friend_id.eq.${senderId})`)
    .single();

  if (friendshipError && friendshipError.code !== 'PGRST116') {
    throw friendshipError;
  }

  if (existingFriendship) {
    throw new Error('Already friends with this user');
  }

  // If no existing request or friendship, create new request
  const { data, error } = await supabase
    .from('friend_requests')
    .insert([{ sender_id: senderId, receiver_id: receiverId }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getPendingFriendRequests = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('friend_requests')
    .select(`
      id,
      sender:sender_id (id, username, avatar_url),
      created_at
    `)
    .eq('receiver_id', user.id)
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

export const searchDevelopers = async (search_query, skill_filter, interest_filter, experience_filter, page_number, page_size) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const currentUserId = user.id;

  const { data, error } = await supabase
    .rpc('search_developers', {
      search_query,
      skill_filter,
      interest_filter,
      experience_filter,
      page_number,
      page_size,
      exclude_user_id: currentUserId
    });

  if (error) throw error;

  // Filter out the current user from the results
  const filteredData = data.filter(developer => developer.user_id !== currentUserId);
  return filteredData;
}; 