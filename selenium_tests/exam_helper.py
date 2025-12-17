"""
Exam Helper - Fetches questions and correct answers from Supabase
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from backend
backend_env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend', '.env')
load_dotenv(backend_env_path)

# Supabase credentials
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')


def get_exam_answers():
    """
    Fetch random exam questions with correct answers from database using HTTP
    Returns a list of question IDs with their correct answers
    """
    try:
        headers = {
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json'
        }
        
        # Fetch 12 MCQ questions
        mcq_url = f'{SUPABASE_URL}/rest/v1/questions?question_type=eq.mcq&is_active=eq.true&select=id,question_text_en,correct_answer&limit=12'
        mcq_response = requests.get(mcq_url, headers=headers)
        mcq_response.raise_for_status()
        mcq_questions = mcq_response.json()
        
        # Fetch 3 Road Sign questions
        road_sign_url = f'{SUPABASE_URL}/rest/v1/questions?question_type=eq.road_sign&is_active=eq.true&select=id,question_text_en,correct_answer&limit=3'
        road_sign_response = requests.get(road_sign_url, headers=headers)
        road_sign_response.raise_for_status()
        road_sign_questions = road_sign_response.json()
        
        # Combine questions (total 15)
        all_questions = mcq_questions + road_sign_questions
        
        # Create answer map: {question_text: correct_answer}
        answer_map = {}
        for q in all_questions:
            # Store full question text as key for better matching
            question_text = q['question_text_en'].strip()
            answer_map[question_text] = q['correct_answer']
        
        print(f"✅ Fetched {len(all_questions)} exam questions with correct answers")
        return answer_map
        
    except Exception as e:
        print(f"❌ Error fetching exam answers: {e}")
        # Return None so test can handle it
        return None


def get_correct_answer_for_question(question_text, answer_map):
    """
    Get the correct answer for a given question text
    
    Args:
        question_text: The question text from the exam UI
        answer_map: Dictionary mapping question text to correct answers
    
    Returns:
        Correct answer (A, B, C, or D) or 'A' as fallback
    """
    if not answer_map:
        return 'A'  # Fallback
    
    # Clean up the question text from UI
    question_clean = question_text.strip()
    
    # Try exact match first
    if question_clean in answer_map:
        return answer_map[question_clean]
    
    # Try partial match (at least 20 characters overlap)
    for db_question, answer in answer_map.items():
        # Check if UI question is contained in DB question or vice versa
        if len(question_clean) > 20:
            if question_clean in db_question or db_question in question_clean:
                print(f"✅ Matched question, answer: {answer}")
                return answer
    
    # Fallback to A if no match found
    print(f"⚠️ No answer found for question: '{question_clean[:60]}...', using A as fallback")
    return 'A'


if __name__ == '__main__':
    # Test the helper
    answers = get_exam_answers()
    if answers:
        print(f"\n📝 Sample questions from database:")
        for i, (question, answer) in enumerate(list(answers.items())[:3], 1):
            print(f"{i}. {question} -> {answer}")
