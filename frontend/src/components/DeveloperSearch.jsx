import React, { useState, useEffect } from 'react';
import { debounce } from 'lodash';
import Select from 'react-select';
import { supabase } from '../supabaseClient';
import './DeveloperSearch.css';

const DeveloperSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [developers, setDevelopers] = useState([]);
  const [skills, setSkills] = useState([]);
  const [interests, setInterests] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedExperience, setSelectedExperience] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const experienceLevels = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' }
  ];

  useEffect(() => {
    fetchSkillsAndInterests();
  }, []);

  useEffect(() => {
    if (searchQuery !== undefined) {
      searchDevelopers();
    }
  }, [searchQuery, selectedSkills, selectedInterests, selectedExperience, page]);

  const fetchSkillsAndInterests = async () => {
    try {
      const [skillsResponse, interestsResponse] = await Promise.all([
        supabase.from('skills').select('*').order('name'),
        supabase.from('interests').select('*').order('name')
      ]);

      if (skillsResponse.error) throw skillsResponse.error;
      if (interestsResponse.error) throw interestsResponse.error;

      setSkills(skillsResponse.data?.map(skill => ({ value: skill.name, label: skill.name })) || []);
      setInterests(interestsResponse.data?.map(interest => ({ value: interest.name, label: interest.name })) || []);
    } catch (error) {
      console.error('Error fetching skills and interests:', error);
      setError('Failed to load skills and interests');
    }
  };

  const searchDevelopers = debounce(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Please log in to search developers');
        return;
      }

      // Format search query - handle special characters
      const formattedQuery = searchQuery
        ? searchQuery
            .trim()
            .split(/\s+/)
            .map(term => {
              // Remove special characters that could break tsquery
              const sanitized = term.replace(/[!@#$%^&*(),.?":{}|<>]/g, '');
              return sanitized ? `${sanitized}:*` : null;
            })
            .filter(Boolean) // Remove null/empty terms
            .join(' & ')
        : null;

      // Prepare parameters
      const params = {
        search_query: formattedQuery,
        skill_filter: selectedSkills?.length > 0 ? selectedSkills.map(s => s.value) : null,
        interest_filter: selectedInterests?.length > 0 ? selectedInterests.map(i => i.value) : null,
        experience_filter: selectedExperience?.length > 0 ? selectedExperience.map(e => e.value) : null,
        page_number: page,
        page_size: 10
      };

      console.log('Search params:', params); // Debug log

      const { data, error: searchError } = await supabase.rpc('search_developers', params);

      if (searchError) {
        console.error('Search error:', searchError);
        throw new Error(searchError.message || 'Failed to search developers');
      }

      if (!data) {
        console.warn('No data returned from search');
        setDevelopers([]);
        setHasMore(false);
        return;
      }

      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response format from server');
      }

      const processedData = data.map(dev => ({
        ...dev,
        skills: Array.isArray(dev.skills) ? dev.skills : [],
        interests: Array.isArray(dev.interests) ? dev.interests : [],
        match_score: typeof dev.match_score === 'number' ? dev.match_score : 0
      }));

      if (page === 1) {
        setDevelopers(processedData);
      } else {
        setDevelopers(prev => [...prev, ...processedData]);
      }

      setHasMore(processedData.length === 10);
    } catch (error) {
      console.error('Error searching developers:', error);
      setError(error.message || 'Failed to search developers. Please try again.');
      setDevelopers([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, 300);

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const DeveloperCard = ({ developer }) => (
    <div className="developer-card card">
      <div className="developer-header">
        <img 
          src={developer.avatar_url || 'https://via.placeholder.com/50'} 
          alt={developer.username}
          className="developer-avatar"
        />
        <div className="developer-info">
          <h3>{developer.full_name || developer.username}</h3>
          <span className="experience-badge">{developer.experience_level}</span>
        </div>
      </div>
      <p className="developer-bio">{developer.bio || 'No bio available'}</p>
      <div className="skills-container">
        <h4>Skills</h4>
        <div className="skill-tags">
          {(developer.skills || []).map((skill, index) => (
            <span key={index} className="skill-tag">{skill}</span>
          ))}
        </div>
      </div>
      <div className="interests-container">
        <h4>Interests</h4>
        <div className="interest-tags">
          {(developer.interests || []).map((interest, index) => (
            <span key={index} className="interest-tag">{interest}</span>
          ))}
        </div>
      </div>
      {developer.match_score !== undefined && (
        <div className="match-score">
          Match Score: {Math.round(developer.match_score * 100)}%
        </div>
      )}
      <button 
        className="btn btn-primary"
        onClick={() => window.location.href = `/profile/${developer.user_id}`}
      >
        View Profile
      </button>
    </div>
  );

  return (
    <div className="developer-search-container">
      <div className="search-filters card">
        <input
          type="text"
          placeholder="Search developers..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="input"
        />
        <div className="filters">
          <Select
            isMulti
            placeholder="Select Skills"
            options={skills}
            value={selectedSkills}
            onChange={(selected) => {
              setSelectedSkills(selected || []);
              setPage(1);
            }}
            className="filter-select"
            classNamePrefix="select"
          />
          <Select
            isMulti
            placeholder="Select Interests"
            options={interests}
            value={selectedInterests}
            onChange={(selected) => {
              setSelectedInterests(selected || []);
              setPage(1);
            }}
            className="filter-select"
            classNamePrefix="select"
          />
          <Select
            isMulti
            placeholder="Experience Level"
            options={experienceLevels}
            value={selectedExperience}
            onChange={(selected) => {
              setSelectedExperience(selected || []);
              setPage(1);
            }}
            className="filter-select"
            classNamePrefix="select"
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="developers-grid">
        {developers.map((developer) => (
          <DeveloperCard key={developer.id} developer={developer} />
        ))}
      </div>

      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      {!loading && hasMore && developers.length > 0 && (
        <button onClick={loadMore} className="btn btn-secondary load-more-button">
          Load More
        </button>
      )}

      {!loading && developers.length === 0 && !error && (
        <div className="no-results card">
          No developers found matching your criteria
        </div>
      )}
    </div>
  );
};

export default DeveloperSearch; 