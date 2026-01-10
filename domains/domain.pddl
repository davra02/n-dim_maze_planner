(define (domain temporal-maze)
  (:requirements :strips :typing :durative-actions :action-costs :timed-initial-literals)
  (:types cell button door elevator agent)

  (:predicates
    (agent-at ?a - agent ?c - cell)
    (adjacent ?from - cell ?to - cell)
    (agent-free ?a - agent)
    (up ?b - button ?d - door)
    (button-at ?b - button ?c - cell)
    (door-open ?d - door)
    (connects ?d - door ?from - cell ?to - cell)
    (stairs ?from - cell ?to - cell)
    (elevator-connects ?e - elevator ?from - cell ?to - cell)
    (up-elevator ?b - button ?e - elevator)
    (elevator-active ?e - elevator)
  )

  (:functions
    (total-cost)
  )

  ;; Move between adjacent cells. Doors can be modeled as edges that require door-open.
  (:durative-action move
    :parameters (?a - agent ?from - cell ?to - cell)
    :duration (= ?duration 1)
    :condition (and
      (at start (agent-at ?a ?from))
      (at start (agent-free ?a))
      (at start (adjacent ?from ?to))
    )
    :effect (and
      (at start (increase (total-cost) 1))
      (at start (not (agent-free ?a)))
      (at start (not (agent-at ?a ?from)))
      (at end (agent-free ?a))
      (at end (agent-at ?a ?to))
    )
  )

  ;; Move through a door edge if it is open.
  (:durative-action move-through-door
    :parameters (?a - agent ?from - cell ?to - cell ?d - door)
    :duration (= ?duration 1)
    :condition (and
      (at start (agent-at ?a ?from))
      (at start (agent-free ?a))
      (at start (door-open ?d))
      (at start (connects ?d ?from ?to))
    )
    :effect (and
      (at start (increase (total-cost) 1))
      (at start (not (agent-free ?a)))
      (at start (not (agent-at ?a ?from)))
      (at end (agent-free ?a))
      (at end (agent-at ?a ?to))
    )
  )

  ;; Press a button to open a door.
  (:durative-action press-button
    :parameters (?a - agent ?b - button ?d - door ?c - cell)
    :duration (= ?duration 1)
    :condition (and
      (at start (agent-at ?a ?c))
      (at start (agent-free ?a))
      (at start (button-at ?b ?c))
      (at start (up ?b ?d))
    )
    :effect (and
      (at start (increase (total-cost) 1))
      (at start (not (agent-free ?a)))
      (at end (door-open ?d))
      (at end (agent-free ?a))
    )
  )

  ;; Activate an elevator via a remote button.
  (:durative-action activate-elevator
    :parameters (?a - agent ?b - button ?e - elevator ?c - cell)
    :duration (= ?duration 1)
    :condition (and
      (at start (agent-at ?a ?c))
      (at start (agent-free ?a))
      (at start (button-at ?b ?c))
      (at start (up-elevator ?b ?e))
    )
    :effect (and
      (at start (increase (total-cost) 1))
      (at start (not (agent-free ?a)))
      (at end (elevator-active ?e))
      (at end (agent-free ?a))
    )
  )

  ;; Stairs: slower and more expensive but no activation needed.
  (:durative-action take-stairs
    :parameters (?a - agent ?from - cell ?to - cell)
    :duration (= ?duration 3)
    :condition (and
      (at start (agent-at ?a ?from))
      (at start (agent-free ?a))
      (at start (stairs ?from ?to))
    )
    :effect (and
      (at start (increase (total-cost) 3))
      (at start (not (agent-free ?a)))
      (at start (not (agent-at ?a ?from)))
      (at end (agent-free ?a))
      (at end (agent-at ?a ?to))
    )
  )

  ;; Elevator: same as a normal move cost/time, but requires activation.
  (:durative-action take-elevator
    :parameters (?a - agent ?from - cell ?to - cell ?e - elevator)
    :duration (= ?duration 1)
    :condition (and
      (at start (agent-at ?a ?from))
      (at start (agent-free ?a))
      (at start (elevator-active ?e))
      (at start (elevator-connects ?e ?from ?to))
    )
    :effect (and
      (at start (increase (total-cost) 1))
      (at start (not (agent-free ?a)))
      (at start (not (agent-at ?a ?from)))
      (at end (agent-free ?a))
      (at end (agent-at ?a ?to))
    )
  )
)
